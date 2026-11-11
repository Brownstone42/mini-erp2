import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash, randomUUID, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const exec = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const selfTest = process.argv.includes("--self-test");
const image = "mini-erp2-backup-tools:pg17";
const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
const prefix = `mini-erp2-restore-${randomUUID().slice(0, 8)}`;
const restoreName = `${prefix}-db`;
const restoreVolume = `${prefix}-data`;
const fixtureName = `${prefix}-fixture`;
const backupDir = resolve(root, ".backups", `${selfTest ? "self-test-" : "staging-"}${runId}`);
const archivePath = resolve(backupDir, "staging.dump");
const localPassword = randomBytes(24).toString("hex");
let sourceUrl;
let fixtureCreated = false;
let restoreCreated = false;
let stage = "validate source";

const docker = async (args, env = {}) => {
  try {
    const { stdout } = await exec("docker", args, {
      cwd: root, env: { ...process.env, ...env }, timeout: 300000,
      windowsHide: true, maxBuffer: 16 * 1024 * 1024,
    });
    return stdout.trim();
  } catch (error) {
    // Do not echo command output containing source connection details.
    throw new Error(`Docker command failed during ${stage} (code ${error.code ?? "unknown"}).`);
  }
};

const readOptions = "-c default_transaction_read_only=on -c statement_timeout=120000 -c timezone=UTC";
const query = `SELECT json_build_object(
  'database', current_database(),
  'read_only', current_setting('transaction_read_only'),
  'server_version_num', current_setting('server_version_num'),
  'checked_at', CURRENT_TIMESTAMP,
  'schedules', COALESCE((SELECT json_agg(t ORDER BY t.sku, t."warehouseCode") FROM
    (SELECT "sku" AS sku, "warehouseCode", "reviewDate"::text AS review_date FROM public."ReviewSchedule") t), '[]'::json),
  'migrations', COALESCE((SELECT json_agg(t ORDER BY t.id) FROM
    (SELECT * FROM public._prisma_migrations) t), '[]'::json)
);`;
const psqlArgs = ["psql", "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", query];
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const dataOnly = value => ({ schedules: value.schedules, migrations: value.migrations });

async function waitForDatabase(name, database) {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      // TCP avoids the temporary socket-only server during image initialization.
      await docker(["exec", name, "pg_isready", "-h", "127.0.0.1", "-U", "restore_operator", "-d", database]);
      return;
    } catch { await new Promise(r => setTimeout(r, 1000)); }
  }
  throw new Error("Isolated PostgreSQL did not become ready.");
}

async function sourceCommand(args) {
  if (selfTest) {
    return docker(["exec", "-e", `PGOPTIONS=${readOptions}`, "-e", "PGUSER=restore_operator", "-e", "PGDATABASE=mini_erp_staging", fixtureName, ...args]);
  }
  const env = {
    PGHOST: sourceUrl.hostname,
    PGPORT: sourceUrl.port || "5432",
    PGDATABASE: "mini_erp_staging",
    PGUSER: decodeURIComponent(sourceUrl.username),
    PGPASSWORD: decodeURIComponent(sourceUrl.password),
    PGSSLMODE: "verify-full",
    PGSSLROOTCERT: "/etc/ssl/certs/ca-certificates.crt",
    PGCONNECT_TIMEOUT: "15",
    PGOPTIONS: readOptions,
  };
  // Forward environment variable names only; no password in argv or files.
  return docker(["run", "--rm", "--mount", `type=bind,source=${backupDir},target=/backup`,
    ...Object.keys(env).flatMap(key => ["-e", key]), image, ...args], env);
}

async function restoredState() {
  return JSON.parse(await docker(["exec", "-e", `PGOPTIONS=${readOptions}`, restoreName,
    ...psqlArgs.slice(0, -2), "-U", "restore_operator", "-d", "mini_erp_restore", "-c", query]));
}

try {
  if (!selfTest) {
    const raw = process.env.STAGING_DATABASE_URL;
    if (!raw) throw new Error("Set STAGING_DATABASE_URL to the staging External Database URL first.");
    try { sourceUrl = new URL(raw); } catch { throw new Error("Invalid staging URL."); }
    if (!["postgres:", "postgresql:"].includes(sourceUrl.protocol)
      || !sourceUrl.hostname.endsWith(".render.com")
      || decodeURIComponent(sourceUrl.pathname.slice(1)) !== "mini_erp_staging"
      || !sourceUrl.username || !sourceUrl.password) {
      throw new Error("Refusing source: expected Render External URL for database mini_erp_staging.");
    }
  }
  await mkdir(backupDir, { recursive: true });
  console.log(selfTest ? "SELF-TEST: local fixture only; no Render access." : "Source: Render mini_erp_staging (read-only). Keep review dates unchanged until this run finishes.");
  stage = "build PostgreSQL backup tools";
  console.log("Preparing PostgreSQL 17 tools in Docker...");
  await docker(["build", "-f", "Dockerfile.backup", "-t", image, "."]);

  if (selfTest) {
    stage = "create isolated source fixture";
    await docker(["run", "-d", "--name", fixtureName, "--network", "none", "--tmpfs", "/var/lib/postgresql/data",
      "--mount", `type=bind,source=${backupDir},target=/backup`,
      "-e", "POSTGRES_USER=restore_operator", "-e", "POSTGRES_DB=mini_erp_staging", "-e", "POSTGRES_PASSWORD", image],
    { POSTGRES_PASSWORD: localPassword });
    fixtureCreated = true;
    await waitForDatabase(fixtureName, "mini_erp_staging");
    const migration = await readFile(resolve(root, "prisma/migrations/202611100001_review_schedule/migration.sql"), "utf8");
    await docker(["exec", fixtureName, "psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", "restore_operator", "-d", "mini_erp_staging", "-c",
      `${migration}
      CREATE TABLE _prisma_migrations (id text PRIMARY KEY, checksum text, migration_name text, applied_steps_count integer);
      INSERT INTO _prisma_migrations VALUES ('fixture', 'fixture-checksum', '202611100001_review_schedule', 1);
      INSERT INTO "ReviewSchedule" VALUES ('VINYL-001','WH-01','2026-11-26');`]);
  }

  stage = "read source before backup";
  const before = JSON.parse(await sourceCommand(psqlArgs));
  assert.equal(before.read_only, "on", "Source connection must be read-only.");
  if (Math.floor(Number(before.server_version_num) / 10000) !== 17) throw new Error("This rehearsal requires PostgreSQL 17; no restore was attempted.");
  assert.ok(before.schedules.length > 0, "No review dates found; stop and confirm the intended source.");
  assert.ok(before.migrations.length > 0, "No migration history found.");
  stage = "read-only pg_dump";
  console.log("Creating custom-format archive...");
  await sourceCommand(["pg_dump", "--format=custom", "--no-owner", "--no-acl", "--lock-wait-timeout=15000", "--file=/backup/staging.dump"]);
  const archive = await readFile(archivePath);
  assert.equal(archive.subarray(0, 5).toString(), "PGDMP", "Not a custom-format PostgreSQL archive.");

  stage = "create new isolated restore database";
  console.log("Creating separate restore database (no exposed network port)...");
  await docker(["volume", "create", "--label", "mini-erp2.purpose=restore-rehearsal", restoreVolume]);
  await docker(["run", "-d", "--name", restoreName, "--label", "mini-erp2.purpose=restore-rehearsal", "--network", "none",
    "--mount", `type=volume,source=${restoreVolume},target=/var/lib/postgresql/data`,
    "--mount", `type=bind,source=${backupDir},target=/backup,readonly`,
    "-e", "POSTGRES_USER=restore_operator", "-e", "POSTGRES_DB=mini_erp_restore", "-e", "POSTGRES_PASSWORD", image],
  { POSTGRES_PASSWORD: localPassword });
  restoreCreated = true;
  await waitForDatabase(restoreName, "mini_erp_restore");
  stage = "restore into new local database";
  // Target is fixed inside our new network-isolated container. Never use source URL.
  await docker(["exec", restoreName, "pg_restore", "--exit-on-error", "--single-transaction", "--no-owner", "--no-acl",
    "-U", "restore_operator", "-d", "mini_erp_restore", "/backup/staging.dump"]);
  stage = "compare restored data and source";
  const restored = await restoredState();
  const after = JSON.parse(await sourceCommand(psqlArgs));
  assert.equal(after.read_only, "on", "Source verification connection must be read-only.");
  const sameRestoredData = digest(dataOnly(before)) === digest(dataOnly(restored));
  const sameSourceData = digest(dataOnly(before)) === digest(dataOnly(after));
  const report = {
    mode: selfTest ? "local-self-test" : "render-staging-rehearsal",
    result: sameRestoredData && sameSourceData ? "PASS" : "MISMATCH",
    sourceDatabase: before.database, sourceCheckedBefore: before.checked_at, sourceCheckedAfter: after.checked_at,
    sourceReviewDates: before.schedules, restoredReviewDates: restored.schedules,
    migrationCount: before.migrations.length, sameRestoredData, sameSourceData,
    sourceReadOnly: before.read_only === "on" && after.read_only === "on",
    archiveSha256: createHash("sha256").update(archive).digest("hex"), archiveBytes: archive.length,
    sourceStateSha256: digest(dataOnly(before)), restoredStateSha256: digest(dataOnly(restored)),
    archivePath, restoreDatabase: "mini_erp_restore", restoreContainer: restoreName, restoreVolume,
  };
  await writeFile(resolve(backupDir, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!sameRestoredData || !sameSourceData) throw new Error("Data differed; review report.json before declaring success. Concurrent source writes can cause this.");
  console.log("PASS: archive restored; review dates and migration history match; source observations unchanged.");
} catch (error) {
  console.error(`FAILED at ${stage}: ${error.message}`);
  process.exitCode = 1;
} finally {
  stage = "clean up this rehearsal only";
  if (restoreCreated) {
    try { await docker(["stop", restoreName]); console.log(`Restore container stopped; data retained in ${restoreVolume}.`); }
    catch { console.error(`Could not stop ${restoreName}; inspect this rehearsal container.`); process.exitCode = 1; }
  }
  if (fixtureCreated) {
    try { await docker(["rm", "-f", fixtureName]); }
    catch { console.error(`Could not remove local fixture ${fixtureName}.`); process.exitCode = 1; }
  }
}
