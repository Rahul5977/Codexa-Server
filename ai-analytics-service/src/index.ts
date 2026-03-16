import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { env } from "./config/env.js";
import { analyticsWorker } from "./workers/analytics.workers.js";
import analyticsRoutes from "./routes/analytics.routes.js";

dotenv.config();

const app = express();

app.use(
  cors({
    // Reflect request origin so browser preflight always receives a valid ACAO header.
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Ensure browsers always get a valid preflight response.
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  return next();
});
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
