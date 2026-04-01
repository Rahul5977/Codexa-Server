import express from "express";
import dotenv from "dotenv";
import submissionRoutes from "./routes/submission.routes";
import ideWorkspaceRoutes from "./routes/ide-workspace.routes";
import { connectRedis, isRedisConnected } from "./config/redis.js";
import cors from 'cors'

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
