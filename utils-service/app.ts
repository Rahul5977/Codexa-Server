import express from "express";

const app = express();

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "utils-service",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Info endpoint
app.get("/", (_req, res) => {
  res.status(200).json({
    service: "Codexa Utils Service",
    version: "1.0.0",
    description: "Email notification consumer service",
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    statusCode: 404,
    message: "Route not found",
    success: false,
  });
});

export default app;
