import { NextRequest } from "next/server";
import { buildPrompt } from "@/lib/prompt-builder";
import { generateWithDeepSeekStream } from "@/lib/ai-client";
import { getTemplate, createGeneration, getStyle } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_PLATFORMS = ["xiaohongshu", "douyin", "gongzhonghao", "weibo", "bilibili", "zhihu"];
const VALID_CONTENT_TYPES = ["tuwen", "short_video", "long_article", "title", "comment", "live_script"];

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topic, platform, contentType, model = "deepseek-chat", styleId } = body;

  if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
    return new Response(JSON.stringify({ error: "请输入主题" }), { status: 400 });
  }
  if (!VALID_PLATFORMS.includes(platform)) {
    return new Response(JSON.stringify({ error: `不支持的平台: ${platform}` }), { status: 400 });
  }
  if (!VALID_CONTENT_TYPES.includes(contentType)) {
    return new Response(JSON.stringify({ error: `不支持的内容类型: ${contentType}` }), { status: 400 });
  }

  const trimmedTopic = topic.trim();

  let systemPrompt: string, userPrompt: string, temperature: number;
  try {
    const built = await buildPrompt(platform, contentType, trimmedTopic);
    systemPrompt = built.systemPrompt;
    userPrompt = built.userPrompt;
    temperature = built.temperature;
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "模板不存在" }),
      { status: 400 }
    );
  }

  // 风格注入
  if (styleId) {
    try {
      const style = await getStyle(styleId);
      if (style) {
        const profile = JSON.parse((style as any).profile || "{}");
        if (profile.voicePrompt) {
          systemPrompt = `【写作风格要求】${profile.voicePrompt}\n\n${systemPrompt}`;
        }
      }
    } catch { /* ignore style errors */ }
  }

  const encoder = new TextEncoder();
  let fullContent = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const gen = generateWithDeepSeekStream(systemPrompt, userPrompt, temperature, model);
        for await (const chunk of gen) {
          fullContent += chunk;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: chunk })}\n\n`));
        }

        const template = await getTemplate(platform, contentType);
        const generation = await createGeneration({
          templateId: (template as any)?.id || "unknown",
          topic: trimmedTopic,
          platform,
          contentType,
          rawPrompt: `System: ${systemPrompt}\n\nUser: ${userPrompt}`,
          rawResponse: fullContent,
          formattedContent: JSON.stringify({ body: fullContent }),
          temperature,
        });

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          done: true, id: generation.id, topic: generation.topic,
          platform: generation.platform, contentType: generation.contentType,
        })}\n\n`));
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "生成失败";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
