import express from "express";
import type { Request, Response, NextFunction } from "express";
import authRoutes from "./routes/auth.routes.js";
import { ApiError } from "./utils/api-error.js";
import cors from 'cors'

const app = express();

// CORS configuration - must be before other middleware
app.use(cors())

// Skip body parsing for multipart/form-data routes
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return next();
  }
  express.json({ limit: "10mb" })(req, res, next);
});

app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return next();
  }
  express.urlencoded({ extended: true, limit: "10mb" })(req, res, next);
});

app.set("trust proxy", 1);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "auth-service",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use("/api/auth", authRoutes);

app.use((req, res) => {
  res.status(404).json({
    statusCode: 404,
    message: "Route not found",
    success: false,
    errors: [],
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error("Error:", err);

  // Handle ApiError
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle Zod validation errors
  if (err.name === "ZodError") {
    return res.status(400).json({
      statusCode: 400,
      message: "Validation error",
      success: false,
      errors: err,
    });
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({
      statusCode: 401,
      message: "Invalid or expired token",
      success: false,
      errors: [],
    });
  }

  // Handle Prisma errors
  if (err.name === "PrismaClientKnownRequestError") {
    return res.status(400).json({
      statusCode: 400,
      message: "Database error",
      success: false,
      errors: process.env.NODE_ENV === "development" ? [err.message] : [],
    });
  }

  // Default error
  res.status(500).json({
    statusCode: 500,
    message: "Internal server error",
    success: false,
    errors: process.env.NODE_ENV === "development" ? [err.message] : [],
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

export default app;
