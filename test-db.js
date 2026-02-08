require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");

console.log("🔄 Testing Prisma with adapter...");
console.log("DATABASE_URL:", process.env.DATABASE_URL);

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
  connectionTimeoutMillis: 5000,
  max: 5,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({
  adapter,
  log: ["query", "error", "warn"],
});

async function test() {
  try {
    console.log("🔄 Connecting to Prisma...");
    await prisma.$connect();
    console.log("✅ Prisma connected");

    console.log("🔄 Running query...");
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log("✅ Query result:", result);

    console.log("🔄 Finding users...");
    const users = await prisma.user.findMany({ take: 1 });
    console.log("✅ Users count:", users.length);

    await prisma.$disconnect();
    console.log("✅ Test complete");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

test();
