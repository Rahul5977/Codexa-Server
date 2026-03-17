import argon2 from "argon2";
import { prisma } from "@codexa/db";

const ADMIN_EMAIL = "codexa_admin@iitbhilai.ac.in";
const ADMIN_PASSWORD = "Admin@123";
const ADMIN_NAME = "Codexa Admin";

async function createOrUpdateAdmin() {
  const hashedPassword = await argon2.hash(ADMIN_PASSWORD, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: ADMIN_NAME,
      password: hashedPassword,
      role: "ADMIN",
      emailVerified: true,
      status: "ACTIVE",
    },
    create: {
      id: crypto.randomUUID(),
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: "ADMIN",
      emailVerified: true,
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      status: true,
    },
  });

  console.log("Admin user is ready:");
  console.log(admin);
}

createOrUpdateAdmin()
  .catch((error) => {
    console.error("Failed to create/update admin user:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
