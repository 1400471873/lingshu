import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrisma() {
  const turboUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const turboToken = process.env.TURSO_AUTH_TOKEN;

  if (turboUrl?.startsWith("libsql://") && turboToken) {
    // Turso 远程数据库
    const { createClient } = require("@libsql/client");
    const { PrismaLibSql } = require("@prisma/adapter-libsql");
    const libsql = createClient({ url: turboUrl, authToken: turboToken });
    const adapter = new PrismaLibSql(libsql);
    return new PrismaClient({ adapter } as any);
  }

  // 本地 SQLite
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma || createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
