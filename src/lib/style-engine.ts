import { generateWithDeepSeek } from "./ai-client";

const STYLE_EXTRACT_PROMPT = `你是一个文风分析专家。分析以下多篇文案样本，提取作者的写作风格画像。返回严格 JSON：

{
  "tone": "语气描述（10字以内）",
  "sentenceLength": "短/中/长",
  "habits": ["习惯用语1", "习惯用语2", ...],
  "emojiStyle": "常用emoji类型",
  "formatting": "段落/排版习惯",
  "voicePrompt": "一段50字以内的风格描述，可以直接注入到AI生成prompt中"
}

严格只返回JSON，不要额外文字。`;

export async function extractStyle(samples: string[]) {
  const text = samples.map((s, i) => `【样本${i + 1}】\n${s}`).join("\n\n---\n\n");

  const raw = await generateWithDeepSeek(STYLE_EXTRACT_PROMPT, text, 0.3);

  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("风格提取失败，请确保提供了足够的文案样本");
  }
}
