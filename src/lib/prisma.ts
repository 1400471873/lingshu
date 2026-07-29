import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrisma(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL || "file:./dev.db";

  if (dbUrl.startsWith("libsql://")) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const { createClient } = require("@libsql/client");
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const { PrismaLibSql } = require("@prisma/adapter-libsql");
    const libsql = createClient({
      url: dbUrl,
      authToken: process.env.TURSO_AUTH_TOKEN || "",
    });
    const adapter = new PrismaLibSql(libsql);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new PrismaClient({ adapter } as any);
  }

  return new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });
}

// Lazy init — 避免 Vercel 构建时初始化
let _prisma: PrismaClient;
function getPrisma() {
  if (!_prisma) _prisma = globalForPrisma.prisma || createPrisma();
  return _prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return (getPrisma() as any)[prop];
  },
});
