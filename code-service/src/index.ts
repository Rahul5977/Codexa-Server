import express from "express";
import dotenv from "dotenv";
import submissionRoutes from "./routes/submission.routes";
import ideWorkspaceRoutes from "./routes/ide-workspace.routes";
import { connectRedis, isRedisConnected } from "./config/redis.js";
import cors from 'cors'
import { prisma } from "@codexa/db";

dotenv.config();

const app = express();
app.use(express.json({ limit: process.env.BODY_SIZE_LIMIT || "25mb" }));
app.use(express.urlencoded({ extended: true, limit: process.env.BODY_SIZE_LIMIT || "25mb" }));
app.use(cors())
// Routes
app.use("/api/submissions", submissionRoutes);
console.log("✅ Submissions routes registered");
app.use("/api/ide-workspace", ideWorkspaceRoutes);
console.log("✅ IDE Workspace routes registered");

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.type === "entity.too.large" || err?.status === 413) {
    return res.status(413).json({
      message: "Request payload is too large",
    });
  }

  return next(err);
});

const PORT = process.env.PORT || 3003;
const isDevelopment = process.env.NODE_ENV === "development";
const DB_STARTUP_RETRY_ATTEMPTS = 12;
const DB_STARTUP_RETRY_DELAY_MS = 2000;

function isTransientDbStartupError(error: unknown): boolean {
  const message = String((error as any)?.message || error || "").toLowerCase();
  return (
    message.includes("not yet accepting connections") ||
    message.includes("database system is in recovery mode") ||
    message.includes("connection refused") ||
    message.includes("econnrefused") ||
    message.includes("timeout")
  );
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureDatabaseReady(): Promise<void> {
  for (let attempt = 1; attempt <= DB_STARTUP_RETRY_ATTEMPTS; attempt++) {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      console.log("✅ Database connected successfully");
      return;
    } catch (error) {
      if (attempt === DB_STARTUP_RETRY_ATTEMPTS || !isTransientDbStartupError(error)) {
        throw error;
      }

      console.warn(
        `⚠️  Database not ready (attempt ${attempt}/${DB_STARTUP_RETRY_ATTEMPTS}). Retrying in ${DB_STARTUP_RETRY_DELAY_MS}ms...`,
      );
      await sleep(DB_STARTUP_RETRY_DELAY_MS);
    }
  }
}

async function startServer() {
  await ensureDatabaseReady();

  const redisConnected = await connectRedis();

  if (redisConnected) {
    const { submissionWorker } = await import("./workers/submission.workers.js");
    console.log("👷 Worker is listening for jobs...");
  } else if (isDevelopment) {
    console.warn("⚠️  Running without job queue (Redis unavailable)");
  }

  app.listen(PORT, () => {
    console.log(`🚀 Code Service running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
