import { prisma } from "@codexa/db";

export { prisma };

export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect();
  console.log("✅ Database disconnected");
}

export async function connectDB(): Promise<void> {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    throw error;
  }
}
