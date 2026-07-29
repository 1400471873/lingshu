// 应用启动时自动建表 + 写入默认模板
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

  // Vercel 冷启动时自动填充默认模板
  const { nanoid } = await import("nanoid").catch(() => ({
    nanoid: () => Math.random().toString(36).slice(2),
  }));

  const templates = [
    ["cms00000000000000000001", "xiaohongshu", "tuwen", "小红书图文", "你是一个小红书爆款博主，擅长用emoji和口语化表达。输出格式：【标题】+【正文】+【标签】", "写一篇小红书笔记，主题：{{topic}}", 0.8],
    ["cms00000000000000000002", "douyin", "short_video", "抖音短视频脚本", "你是一个抖音短视频编导。输出格式：【开场3秒钩子】+【正文口播】+【结尾引导互动】", "写一个抖音短视频脚本，主题：{{topic}}", 0.8],
    ["cms00000000000000000003", "gongzhonghao", "long_article", "公众号长文", "你是一个公众号深度内容创作者。输出格式：【标题】+【导语】+【正文分节】+【结尾金句】", "写一篇公众号文章，主题：{{topic}}", 0.8],
  ];

  for (const [id, platform, contentType, name, systemPrompt, userPromptTemplate, temperature] of templates) {
    await prisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO ContentTemplate (id, platform, contentType, name, systemPrompt, userPromptTemplate, temperature, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      id, platform, contentType, name, systemPrompt, userPromptTemplate, temperature
    );
  }
}
