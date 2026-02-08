//Responsibilty: Crash the app if environment variables are missing
import dotenv from "dotenv";
dotenv.config();

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 3005,
  DATABASE_URL: process.env.DATABASE_URL || "",
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: Number(process.env.REDIS_PORT) || 6379,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "your-access-secret-key",
};

if (!env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is required");
  process.exit(1);
}

export { env };
