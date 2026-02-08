import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { env } from "./config/env.js";
import { analyticsWorker } from "./workers/analytics.workers.js";
import analyticsRoutes from "./routes/analytics.routes.js";

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

// Routes
app.use("/api/analytics", analyticsRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "analytics-service",
    uptime: process.uptime(),
    worker: analyticsWorker.isRunning() ? "running" : "stopped",
  });
});

// Start Server
app.listen(env.PORT, () => {
  console.log(`📊 Analytics Service running on port ${env.PORT}`);
  console.log(`👂 Analytics Worker is listening for events...`);
});
