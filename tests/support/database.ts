import { Pool } from "pg";

// Dedicated test database only; never inherit DATABASE_URL from the dev app.
export const testDatabaseUrl = "postgresql://mini_erp:local_test_only@127.0.0.1:55433/mini_erp_test";

export async function withTestDatabase<T>(run: (pool: Pool) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: testDatabaseUrl, connectionTimeoutMillis: 5000 });
  try { return await run(pool); } finally { await pool.end(); }
}
