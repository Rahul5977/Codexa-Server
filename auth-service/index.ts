import app from "./app.js";
import { disconnectDB } from "./libs/prisma.js";
import { kafkaProducer } from "./libs/kafka.js";
import type { Server } from "http";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

let server: Server;
let isShuttingDown = false;

async function startServer(): Promise<void> {
  try {
    // Connect Kafka producer
    console.log("Connecting to Kafka...");
    await kafkaProducer.connect();

    server = app.listen(PORT, () => {
      console.log(` Auth Service running on port ${PORT}`);
      console.log(` Environment: ${NODE_ENV}`);
      console.log(` Health check: http://localhost:${PORT}/health`);
    });

    // Handle server errors
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

  // Set a timeout for forced shutdown
  const forceShutdownTimeout = setTimeout(() => {
    console.error("⚠️  Forced shutdown after timeout (10s)");
    process.exit(1);
  }, 10000);

  try {
    // Stop accepting new connections
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log("✅ HTTP server closed");
    }

    // Disconnect Kafka producer
    console.log("🔄 Disconnecting Kafka producer...");
    await kafkaProducer.disconnect();

    // Disconnect from database
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

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("UNHANDLED_REJECTION");
});

// Start the server
startServer();
