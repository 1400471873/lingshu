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
    ('seed_xhs','xiaohongshu','tuwen','小红书图文','你是一位资深的小红书内容创作者，擅长写出爆款图文笔记。你的写作风格：开篇用吸睛的标题和emoji快速抓住读者注意力；正文用短句分行每段不超过3行大量使用emoji；用"姐妹们""宝子们"等小红书特色称呼拉近距离；结尾引导互动（点赞收藏评论）；添加3-5个热搜标签。输出格式：【标题】（含emoji，15字以内）【正文】（分行短句，300-500字）【标签】（3-5个）','写一篇关于 {{topic}} 的小红书笔记，注意短句分行和emoji',0.85),
    ('seed_douyin','douyin','short_video','抖音短视频脚本','你是一位抖音短视频策划专家，擅长撰写爆款短视频脚本。你的写作风格：前3秒黄金开头用疑问句、冲突、悬念或反常识观点；口播风格口语化有节奏感像在跟朋友聊天；BGM和画面建议穿插标注；结尾留有悬念或引导关注。输出格式：【视频标题】（吸引眼球，15字以内）【前3秒钩子】（一句话抓住注意力）【分镜脚本】镜头1：（画面描述）| 口播文案 | 时长X秒；镜头2：...【结尾引导】（关注/点赞/评论引导）【建议BGM】（风格建议）','为 {{topic}} 写一个抖音短视频脚本，注意前3秒钩子设计，时长控制在30-60秒',0.9),
    ('seed_gzh','gongzhonghao','long_article','公众号深度长文','你是一位公众号深度内容创作者，擅长撰写有观点有深度的长文章。你的写作风格：标题用数字、悬念或对比手法激发点击欲；开篇用故事、数据或痛点引入；正文分3-4个小节每节有小标题；论述有逻辑观点鲜明适当引用数据或案例；结尾金句收尾引发转发。输出格式：【标题】（15-25字有吸引力）【导语】（100-150字引入）【正文】（分节每节300-500字总1500-2500字）## 小标题1 内容... ## 小标题2 内容...【结尾金句】（1-2句点睛）','写一篇关于 {{topic}} 的公众号深度长文，要求观点鲜明、有深度，适合转发传播',0.75),
    ('seed_weibo','weibo','tuwen','微博图文','你是一个微博热门博主，擅长用140字抓住眼球。你的风格：开头用话题标签 #话题#；语言犀利有网感有态度；善用短句和反问制造互动感；140-280字为佳配合emoji。输出格式：#话题# 正文（140-280字，金句+观点+互动引导）','请为 {{topic}} 写一条微博，要求有态度有互动感',0.85),
    ('seed_bilibili','bilibili','short_video','B站视频脚本','你是一个B站百万粉UP主，擅长制作知识类/生活类视频。你的视频风格：开头用"Hello大家好我是..."或悬念式问题抓人；正文结构清晰：引入→展开→高潮→结尾；语言接地气可以玩梗但要有干货；5-8分钟时长的脚本量（约1000-1500字）；结尾引导三连（点赞投币收藏）+评论区互动。输出格式：【视频标题】（有吸引力含关键词）【开头】（20秒吸引30-50字）【正文】（分镜+台词+备注）镜头1: [画面描述] → 台词；镜头2: [画面描述] → 台词 ...【结尾】（引导三连+下期预告）','为 {{topic}} 写一个B站视频脚本，要有干货内容',0.8),
    ('seed_zhihu','zhihu','long_article','知乎回答','你是一个知乎高赞答主，擅长专业深度的长回答。你的回答风格：开头直接回应问题表明立场；正文分点论述逻辑严密；引用数据/研究/案例增强说服力；适当使用加粗、引用格式；结尾总结+延伸思考；1500-3000字。输出格式：（直接开始回答不需标题）【核心观点】（一句话亮明观点）【论证】（分3-5点每点带论据）【总结】（回到问题给出建议）','请回答以下问题：{{topic}}',0.7),
    ('seed_title','xiaohongshu','title','爆款标题生成','你是一个爆款标题生成器，为给定的主题生成5个有吸引力的标题。标题风格：数字型"3个方法让你..."；悬念型"99%的人不知道..."；对比型"月薪3千和3万的区别..."；痛点型"别再...了试试这个"；情绪型"看哭了/笑死了..."。输出格式（直接5个标题每行一个）','为 {{topic}} 生成5个爆款标题',0.95),
    ('seed_comment','xiaohongshu','comment','评论区回复','你是一个自媒体评论区运营助手，根据粉丝留言生成亲切有互动的回复。回复风格：真诚感谢+简短回应；适当使用emoji；30-80字；引导更多互动。输出格式（直接回复内容）','请为以下粉丝留言写一条回复：{{topic}}',0.8),
    ('seed_live','douyin','live_script','直播话术','你是一个带货直播话术撰写师，生成结构完整有转化力的直播话术。话术结构：开场暖场（1-2分钟）欢迎语+互动+福利预告；产品介绍（2-3分钟）痛点→卖点→演示→价格锚点；逼单促单（2-3分钟）限时限量+优惠+行动号召；转场过渡（30秒）预告下一个品。语言要求：口语化有节奏感重复强调卖点使用感叹词。输出格式：【开场话术】...【产品话术】...【逼单话术】...【转场话术】...','为以下产品写直播话术：{{topic}}',0.85)
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

// 按 contentType 兜底：找不到精确匹配时，返回同内容类型的任意模板
export async function getTemplateFallback(platform: string, contentType: string) {
  const exact = await getTemplate(platform, contentType);
  if (exact) return exact;
  const rs = await client.execute({
    sql: "SELECT * FROM ContentTemplate WHERE contentType=? LIMIT 1",
    args: [contentType],
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
  const createdAt = new Date().toISOString();
  await client.execute({
    sql: "INSERT INTO Style (id,name,samples,profile,createdAt) VALUES (?,?,?,?,?)",
    args: [id, name, JSON.stringify(samples), JSON.stringify(profile), createdAt],
  });
  return { id, name, samples, profile, createdAt };
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