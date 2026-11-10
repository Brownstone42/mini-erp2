import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Allows client generation on a fresh checkout before .env is copied.
  datasource: { url: process.env.DATABASE_URL ?? "postgresql://mini_erp:local_dev_only@127.0.0.1:55432/mini_erp" },
});
