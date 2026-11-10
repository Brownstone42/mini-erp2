import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const url = "postgresql://mini_erp:local_test_only@127.0.0.1:55433/mini_erp_test";
execFileSync(process.execPath, [resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"], {
  stdio: "inherit", env: { ...process.env, DATABASE_URL: url },
});
