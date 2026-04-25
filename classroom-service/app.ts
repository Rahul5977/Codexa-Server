// @ts-nocheck
import express from "express";
import type { Request, Response, NextFunction } from "express";
import classroomRoutes from "./routes/classroom.routes.js";
import assignmentRoutes from "./routes/assignment.routes.js";
import { ApiError } from "./utils/api-error.js";
import cors from "cors";

const app = express();

// CORS configuration - must be before other middleware
app.use(cors());

// Body parsing middleware
// IDE assignments can include base64-encoded PDFs/datasets, so keep a higher payload cap.
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.set("trust proxy", 1);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "classroom-service",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use("/api/classroom", classroomRoutes);
app.use("/api/classroom", assignmentRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    statusCode: 404,
    message: "Route not found",
    success: false,
    errors: [],
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      statusCode: err.statusCode,
      message: err.message,
      success: err.success,
      errors: err.errors,
    });
  }

  if (err?.type === "entity.too.large" || err?.status === 413) {
    return res.status(413).json({
      statusCode: 413,
      message: "Uploaded assignment files are too large",
      success: false,
      errors: ["Reduce file sizes or upload fewer files at once"],
    });
  }

  // Handle Prisma errors
  if (err.code === "P2002") {
    return res.status(400).json({
      statusCode: 400,
      message: "A record with this data already exists",
      success: false,
      errors: ["Duplicate entry"],
    });
  }

  if (err.code === "P2025") {
    return res.status(404).json({
      statusCode: 404,
      message: "Record not found",
      success: false,
      errors: ["Resource not found"],
    });
  }

  // Default error
  res.status(500).json({
    statusCode: 500,
    message: "Internal server error",
    success: false,
    errors: [err.message || "Something went wrong"],
  });
});

export default app;
