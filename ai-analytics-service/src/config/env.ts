//Responsibilty: Crash the app if environment variables are missing
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Explicitly point to this service's own .env so dotenv doesn't crawl up
dotenv.config({ path: resolve(__dirname, "../../.env") });

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 3005,
  DATABASE_URL: process.env.DATABASE_URL || "",
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: Number(process.env.REDIS_PORT) || 6379,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "your-access-secret-key",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  // How long to cache AI analysis in Redis (seconds). Default: 7 days
  AI_ANALYSIS_TTL: Number(process.env.AI_ANALYSIS_TTL) || 604800,
};

if (!env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is required");
  process.exit(1);
}

if (!env.GEMINI_API_KEY) {
  console.warn("⚠️  GEMINI_API_KEY is not set — AI analysis will be unavailable");
}

export { env };
