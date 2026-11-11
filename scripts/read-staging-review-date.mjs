import { Pool } from "pg";

// Deliberately no dotenv or local DATABASE_URL fallback.
const connectionString = process.env.STAGING_DATABASE_URL;
if (!connectionString) {
  console.error("Set STAGING_DATABASE_URL to the Render staging External Database URL.");
  process.exit(1);
}
let target;
try {
  target = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(target.protocol)
    || !target.hostname.endsWith(".render.com")) throw new Error("Invalid target");
} catch {
  console.error("Expected an External PostgreSQL URL hosted on Render. No connection was made.");
  process.exit(1);
}
// External Render connections require TLS. Configure it explicitly and keep
// certificate validation enabled; URL SSL options must not override this.
for (const key of ["ssl", "sslmode", "sslcert", "sslkey", "sslrootcert"]) {
  target.searchParams.delete(key);
}
const pool = new Pool({
  connectionString: target.toString(),
  ssl: { rejectUnauthorized: true },
  connectionTimeoutMillis: 10000, statement_timeout: 10000, max: 1,
});
let client;
let phase = "connecting with TLS";
try {
  client = await pool.connect();
  phase = "reading in a read-only transaction";
  await client.query("BEGIN READ ONLY");
  const info = await client.query("SELECT current_database() AS database, CURRENT_TIMESTAMP::text AS checked_at");
  const saved = await client.query(
    'SELECT "sku", "warehouseCode", "reviewDate"::text AS review_date FROM "ReviewSchedule" WHERE "sku" = $1 AND "warehouseCode" = $2',
    ["VINYL-001", "WH-01"],
  );
  await client.query("ROLLBACK");
  console.log(JSON.stringify({ ...info.rows[0], rows: saved.rows }, null, 2));
} catch (error) {
  // Do not print connection strings or raw driver errors containing credentials.
  console.error("Read-only check failed. Error code:", error.code ?? error.name ?? "unknown");
  console.error("Phase:", phase);
  process.exitCode = 1;
} finally {
  client?.release();
  await pool.end();
}
