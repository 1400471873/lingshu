// 应用启动时自动建表（兼容 SQLite / Turso）
export async function ensureTables() {
  const { prisma } = await import("./prisma");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ContentTemplate (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      contentType TEXT NOT NULL,
      name TEXT NOT NULL,
      systemPrompt TEXT NOT NULL,
      userPromptTemplate TEXT NOT NULL,
      temperature REAL NOT NULL DEFAULT 0.8,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(platform, contentType)
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Generation (
      id TEXT PRIMARY KEY,
      templateId TEXT NOT NULL,
      topic TEXT NOT NULL,
      platform TEXT NOT NULL,
      contentType TEXT NOT NULL,
      rawPrompt TEXT NOT NULL,
      rawResponse TEXT NOT NULL,
      formattedContent TEXT NOT NULL DEFAULT '{}',
      temperature REAL NOT NULL DEFAULT 0.8,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (templateId) REFERENCES ContentTemplate(id)
    )
  `);
}
