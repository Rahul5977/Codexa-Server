import app from "./app.js";
import dotenv from "dotenv";
import { connectDB, disconnectDB } from "./libs/prisma.js";
import { initKafka, disconnectKafka } from "./libs/kafka.js";

// Load environment variables with override to ensure classroom-service .env takes precedence
dotenv.config({ override: true });

// Verify critical environment variables are loaded
if (!process.env.JWT_ACCESS_SECRET && !process.env.JWT_SECRET) {
  console.error("❌ ERROR: JWT_ACCESS_SECRET or JWT_SECRET not found in environment!");
  console.error("Please check your .env file in classroom-service directory");
  process.exit(1);
}

const PORT = process.env.PORT || 3003;

// Graceful shutdown function
async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  try {
    // Close database connection
    await disconnectDB();

    // Close Kafka connection
    await disconnectKafka();

    console.log("✅ Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("UNHANDLED_REJECTION");
});

// Start the server
async function startServer() {
  try {
    // Connect to database
    await connectDB();

    // Initialize Kafka
    await initKafka();

    // Start the HTTP server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Classroom service is running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`🏫 API endpoint: http://localhost:${PORT}/api/classroom`);
    });

    // Store server reference for graceful shutdown
    process.on("SIGTERM", () => {
      server.close((err) => {
        if (err) {
          console.error("❌ Error closing server:", err);
        } else {
          console.log("✅ HTTP server closed");
        }
      });
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Start the application
startServer();
