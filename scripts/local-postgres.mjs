import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Local fallback only. No Windows service is installed and data is never deleted.
const configurations = [
  { name: "mini_erp", port: 55432, password: "local_dev_only" },
  { name: "mini_erp_test", port: 55433, password: "local_test_only" },
];
const running = [];
async function stop() {
  for (const database of [...running].reverse()) await database.stop();
}
try {
  for (const configuration of configurations) {
    const databaseDir = resolve(".local-postgres", configuration.name);
    const database = new EmbeddedPostgres({
      databaseDir, user: "mini_erp", password: configuration.password,
      port: configuration.port, persistent: true, authMethod: "scram-sha-256",
      initdbFlags: ["--encoding=UTF8", "--locale=C"],
      postgresFlags: ["-h", "127.0.0.1"],
      onLog: () => {}, onError: (message) => console.error(String(message)),
    });
    if (!existsSync(resolve(databaseDir, "PG_VERSION"))) await database.initialise();
    await database.start();
    running.push(database);
    const client = database.getPgClient("postgres", "127.0.0.1");
    await client.connect();
    try {
      const result = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [configuration.name]);
      if (result.rowCount === 0) await client.query(`CREATE DATABASE "${configuration.name}"`);
    } finally { await client.end(); }
    console.log(`${configuration.name} ready on 127.0.0.1:${configuration.port}`);
  }
  console.log("PostgreSQL data persists in .local-postgres. Stop with Ctrl+C.");
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, async () => { await stop(); process.exit(0); });
  }
} catch (error) {
  await stop();
  throw error;
}
