import { generateWithDeepSeek } from "./ai-client";

export interface AnalyzeResult {
  titleFormula: string;
  structure: string;
  keywords: string[];
  tone: string;
  hooks: string[];
  suggestions: string;
}

const ANALYZE_PROMPT = `你是一个爆款文案分析专家。分析以下社交媒体文案，输出严格的 JSON 格式。

分析维度：
- titleFormula: 标题用了什么公式（数字型/悬念型/对比型/痛点型/情绪型等）
- structure: 正文结构分析（开头怎么引入、中间几段、每段功能、结尾怎么收尾）
- keywords: 提取 5-10 个关键词或关键短语
- tone: 语气风格（亲切/专业/搞笑/犀利等）
- hooks: 找出所有吸引注意力的钩子（前3秒/封面关联/互动引导）
- suggestions: 为什么这篇会火？给出 2-3 条可复用的建议

严格只返回 JSON，不要任何额外文字。格式：
{"titleFormula":"...","structure":"...","keywords":["..."],"tone":"...","hooks":["..."],"suggestions":"..."}`;

export async function analyzeContent(text: string): Promise<AnalyzeResult> {
  const raw = await generateWithDeepSeek(
    ANALYZE_PROMPT,
    `请分析以下文案：\n\n${text}`,
    0.3
  );

  // 清理可能的 markdown 代码块包裹
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("分析结果解析失败，请重试");
  }
}
