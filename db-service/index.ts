import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../.env") });

console.log(
  "🔧 DATABASE_URL:",
  process.env.DATABASE_URL ? "Loaded" : "Not found",
);

// Singleton Pattern to prevent connection exhaustion
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // Only use SSL for remote databases
  ssl:
    process.env.DATABASE_URL?.includes("localhost") ||
    process.env.DATABASE_URL?.includes("127.0.0.1")
      ? false
      : process.env.DATABASE_URL?.includes("sslmode=require")
        ? { rejectUnauthorized: false }
        : undefined,
  connectionTimeoutMillis: 5000,
  max: 20,
  idleTimeoutMillis: 30000,
});

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Export types so other services can import { User, Problem } from '@codexa/db'
export * from "@prisma/client";
