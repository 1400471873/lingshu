import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrisma(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL || `file:${process.env.VERCEL ? "/tmp" : "."}/dev.db`;

  if (dbUrl.startsWith("libsql://")) {
    try {
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
    } catch {
      console.warn("Turso adapter failed, falling back to local SQLite");
    }
  }

  return new PrismaClient();
}

let _prisma: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (!_prisma) {
    _prisma = globalForPrisma.prisma || createPrisma();
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = _prisma;
    }
  }
  return _prisma;
}

// Proxy 兼容旧 `import { prisma }` 用法
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return (getPrisma() as any)[prop];
  },
});
