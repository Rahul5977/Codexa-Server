import dotenv from "dotenv";
dotenv.config({ override: true });

import app from "./app.js";
import { connectDB, disconnectDB } from "./libs/prisma.js";
import { kafkaProducer } from "./libs/kafka.js";
import type { Server } from "http";

if (!process.env.JWT_ACCESS_SECRET && !process.env.JWT_SECRET) {
  console.error("❌ ERROR: JWT_ACCESS_SECRET or JWT_SECRET not found in environment!");
  console.error("Please check your .env file in auth-service directory");
  process.exit(1);
}

console.log("✅ JWT secrets loaded from environment");

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

let server: Server;
let isShuttingDown = false;

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
      await connectDB();
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

async function startServer(): Promise<void> {
  try {
    await ensureDatabaseReady();

    console.log("Connecting to Kafka...");
    try {
      await kafkaProducer.connect();
    } catch (kafkaError) {
      if (NODE_ENV === "development") {
        console.warn("⚠️  Kafka connection failed (continuing without Kafka in development mode)");
        console.warn("   Start Kafka with: docker-compose up -d kafka");
      } else {
        throw kafkaError;
      }
    }

    server = app.listen(PORT, () => {
      console.log(` Auth Service running on port ${PORT}`);
      console.log(` Environment: ${NODE_ENV}`);
      console.log(` Health check: http://localhost:${PORT}/health`);
    });

    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      }
      throw error;
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    console.log("Shutdown already in progress...");
    return;
  }

  isShuttingDown = true;
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  const forceShutdownTimeout = setTimeout(() => {
    console.error("⚠️  Forced shutdown after timeout (10s)");
    process.exit(1);
  }, 10000);

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log("✅ HTTP server closed");
    }

    console.log("🔄 Disconnecting Kafka producer...");
    await kafkaProducer.disconnect();

    console.log("🔄 Disconnecting from database...");
    await disconnectDB();

    console.log("✅ Graceful shutdown completed");
    clearTimeout(forceShutdownTimeout);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    clearTimeout(forceShutdownTimeout);
    process.exit(1);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("UNHANDLED_REJECTION");
});

startServer();
