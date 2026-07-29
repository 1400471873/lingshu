import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function makePrisma() {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.VERCEL
          ? "file:/tmp/dev.db"
          : process.env.DATABASE_URL || "file:./dev.db",
      },
    },
  });
}

export const prisma = globalForPrisma.prisma || makePrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
