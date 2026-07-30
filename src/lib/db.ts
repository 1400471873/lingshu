import { createClient } from "@libsql/client";

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const isTurso = dbUrl.startsWith("libsql://");

const client = createClient(
  isTurso
    ? { url: dbUrl, authToken: process.env.TURSO_AUTH_TOKEN || "" }
    : { url: dbUrl }
);

// ====== 建表 + 种子 ======
let tablesReady = false;
export async function ensureTables() {
  if (tablesReady) return;
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS ContentTemplate (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      contentType TEXT NOT NULL,
      name TEXT NOT NULL,
      systemPrompt TEXT NOT NULL,
      userPromptTemplate TEXT NOT NULL,
      temperature REAL DEFAULT 0.8,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      UNIQUE(platform, contentType)
    );
    CREATE TABLE IF NOT EXISTS Generation (
      id TEXT PRIMARY KEY,
      templateId TEXT NOT NULL,
      topic TEXT NOT NULL,
      platform TEXT NOT NULL,
      contentType TEXT NOT NULL,
      rawPrompt TEXT NOT NULL,
      rawResponse TEXT NOT NULL,
      formattedContent TEXT DEFAULT '{}',
      temperature REAL DEFAULT 0.8,
      createdAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS Style (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      samples TEXT DEFAULT '[]',
      profile TEXT DEFAULT '{}',
      createdAt TEXT DEFAULT (datetime('now'))
    );
  `);
  // 插入默认模板
  await client.execute(`
    INSERT OR IGNORE INTO ContentTemplate (id, platform, contentType, name, systemPrompt, userPromptTemplate, temperature)
    VALUES
    ('seed_xhs','xiaohongshu','tuwen','小红书图文','你是小红书博主...','写关于 {{topic}} 的笔记',0.8),
    ('seed_douyin','douyin','short_video','抖音脚本','你是抖音创作者...','写关于 {{topic}} 的脚本',0.8),
    ('seed_gzh','gongzhonghao','long_article','公众号长文','你是公众号作者...','写关于 {{topic}} 的文章',0.8)
  `);
  tablesReady = true;
}

// ====== 随机 ID ======
function uid() {
  return "c" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ====== Template ======
export async function getTemplate(platform: string, contentType: string) {
  const rs = await client.execute({
    sql: "SELECT * FROM ContentTemplate WHERE platform=? AND contentType=?",
    args: [platform, contentType],
  });
  return rs.rows[0] || null;
}

// ====== Generation ======
export async function createGeneration(data: {
  templateId: string; topic: string; platform: string; contentType: string;
  rawPrompt: string; rawResponse: string; formattedContent: string; temperature: number;
}) {
  const id = uid();
  await client.execute({
    sql: `INSERT INTO Generation (id,templateId,topic,platform,contentType,rawPrompt,rawResponse,formattedContent,temperature)
          VALUES (?,?,?,?,?,?,?,?,?)`,
    args: [id, data.templateId, data.topic, data.platform, data.contentType, data.rawPrompt, data.rawResponse, data.formattedContent, data.temperature],
  });
  return { id, ...data };
}

export async function getGeneration(id: string) {
  const rs = await client.execute({ sql: "SELECT * FROM Generation WHERE id=?", args: [id] });
  return rs.rows[0] || null;
}

export async function updateGeneration(id: string, content: string) {
  await client.execute({
    sql: "UPDATE Generation SET rawResponse=?, formattedContent=? WHERE id=?",
    args: [content, JSON.stringify({ body: content }), id],
  });
}

export async function deleteGeneration(id: string) {
  await client.execute({ sql: "DELETE FROM Generation WHERE id=?", args: [id] });
}

export async function listGenerations(search: string, page: number, limit: number) {
  const where = search ? "WHERE topic LIKE ?" : "";
  const args = search ? [`%${search}%`] : [];
  const offset = (page - 1) * limit;

  const [rows, countRs] = await Promise.all([
    client.execute({
      sql: `SELECT id,topic,platform,contentType,formattedContent,createdAt FROM Generation ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
      args: [...args, limit, offset],
    }),
    client.execute({
      sql: `SELECT COUNT(*) as c FROM Generation ${where}`,
      args,
    }),
  ]);

  const total = (countRs.rows[0] as any)?.c || 0;
  const list = rows.rows.map((r: any) => {
    let preview = "";
    try { preview = JSON.parse(r.formattedContent || "{}").body?.slice(0, 120) || ""; } catch {}
    return { ...r, preview };
  });

  return { list, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// ====== Style ======
export async function createStyle(name: string, samples: string[], profile: object) {
  const id = uid();
  await client.execute({
    sql: "INSERT INTO Style (id,name,samples,profile) VALUES (?,?,?,?)",
    args: [id, name, JSON.stringify(samples), JSON.stringify(profile)],
  });
  return { id, name, samples, profile };
}

export async function getStyle(id: string) {
  const rs = await client.execute({ sql: "SELECT * FROM Style WHERE id=?", args: [id] });
  return rs.rows[0] || null;
}

export async function listStyles() {
  const rs = await client.execute({ sql: "SELECT id,name,createdAt FROM Style ORDER BY createdAt DESC" });
  return rs.rows;
}

export async function deleteStyle(id: string) {
  await client.execute({ sql: "DELETE FROM Style WHERE id=?", args: [id] });
}