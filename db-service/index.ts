import { PrismaClient } from '@prisma/client';

// Singleton Pattern to prevent connection exhaustion
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Export types so other services can import { User, Problem } from '@codexa/db'
export * from '@prisma/client';