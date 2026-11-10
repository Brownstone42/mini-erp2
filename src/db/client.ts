import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalForDb = globalThis as unknown as { prisma?: PrismaClient };

export function getDatabase() {
  if (!globalForDb.prisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required");
    const adapter = new PrismaPg({ connectionString, connectionTimeoutMillis: 5000 });
    globalForDb.prisma = new PrismaClient({ adapter });
  }
  return globalForDb.prisma;
}
