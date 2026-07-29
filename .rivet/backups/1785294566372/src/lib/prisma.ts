import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrisma() {
  const turboUrl = process.env.TURSO_DATABASE_URL;
  const turboToken = process.env.TURSO_AUTH_TOKEN;

  if (turboUrl && turboToken) {
    // Vercel / Turso 生产环境
    const libsql = createClient({ url: turboUrl, authToken: turboToken });
    return new PrismaClient({ adapter: new PrismaLibSQL(libsql) });
  }

  // 本地 SQLite
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma || createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
