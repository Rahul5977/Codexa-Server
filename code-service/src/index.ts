import express from "express";
import dotenv from "dotenv";
import submissionRoutes from "./routes/submission.routes";
import { connectRedis, isRedisConnected } from "./config/redis.js";

dotenv.config();

const app = express();
app.use(express.json());

// Routes
app.use("/submissions", submissionRoutes);

const PORT = process.env.PORT || 3003;
const isDevelopment = process.env.NODE_ENV === "development";

async function startServer() {
  // Try to connect to Redis
  const redisConnected = await connectRedis();
  
  // Only import and start worker if Redis is connected
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
