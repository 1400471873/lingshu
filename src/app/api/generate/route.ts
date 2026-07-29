import { NextRequest } from "next/server";
import { buildPrompt } from "@/lib/prompt-builder";
import { generateWithDeepSeekStream } from "@/lib/ai-client";
import { prisma } from "@/lib/prisma";
import { ensureTables } from "@/lib/db-setup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

let tablesEnsured = false;

const VALID_PLATFORMS = ["xiaohongshu", "douyin", "gongzhonghao", "weibo", "bilibili", "zhihu"];
const VALID_CONTENT_TYPES = ["tuwen", "short_video", "long_article", "title", "comment", "live_script"];

export async function POST(request: NextRequest) {
  if (!tablesEnsured) {
    await ensureTables();
    tablesEnsured = true;
  }

  const body = await request.json();
  const { topic, platform, contentType, model = "deepseek-chat" } = body;

  // 参数校验
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

  // 1. 构建 prompt
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

  // 2. SSE 流式响应
  const encoder = new TextEncoder();
  let fullContent = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const gen = generateWithDeepSeekStream(systemPrompt, userPrompt, temperature, model);

        for await (const chunk of gen) {
          fullContent += chunk;
          const data = JSON.stringify({ delta: chunk });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }

        // 3. 存入数据库
        const template = await prisma.contentTemplate.findUnique({
          where: { platform_contentType: { platform, contentType } },
        });

        const generation = await prisma.generation.create({
          data: {
            templateId: template!.id,
            topic: trimmedTopic,
            platform,
            contentType,
            rawPrompt: `System: ${systemPrompt}\n\nUser: ${userPrompt}`,
            rawResponse: fullContent,
            formattedContent: JSON.stringify({ body: fullContent }),
            temperature,
          },
        });

        // 发送元数据事件
        const meta = JSON.stringify({
          done: true,
          id: generation.id,
          topic: generation.topic,
          platform: generation.platform,
          contentType: generation.contentType,
        });
        controller.enqueue(encoder.encode(`data: ${meta}\n\n`));
        controller.close();
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "生成失败，请重试";
        const data = JSON.stringify({ error: errorMsg });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
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
