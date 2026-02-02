import express from "express";
import cors from 'cors'
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import utilsRoutes from "./routes.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

dotenv.config();

const app = express();

// Body parsers
app.use(express.json());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cors())

app.use('/api/utils', utilsRoutes);

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
