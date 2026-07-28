import { NextRequest, NextResponse } from "next/server";
import { buildPrompt } from "@/lib/prompt-builder";
import { generateWithDeepSeek } from "@/lib/ai-client";
import { prisma } from "@/lib/prisma";

const VALID_PLATFORMS = ["xiaohongshu", "douyin", "gongzhonghao"];
const VALID_CONTENT_TYPES = ["tuwen", "short_video", "long_article"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, platform, contentType } = body;

    // 参数校验
    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return NextResponse.json({ error: "请输入主题" }, { status: 400 });
    }

    if (!VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json(
        { error: `不支持的平台: ${platform}` },
        { status: 400 }
      );
    }

    if (!VALID_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: `不支持的内容类型: ${contentType}` },
        { status: 400 }
      );
    }

    const trimmedTopic = topic.trim();

    // 1. 构建 prompt
    const { systemPrompt, userPrompt, temperature } = await buildPrompt(
      platform,
      contentType,
      trimmedTopic
    );

    // 2. 调用 AI
    const rawResponse = await generateWithDeepSeek(
      systemPrompt,
      userPrompt,
      temperature
    );

    // 3. 获取模板 ID
    const template = await prisma.contentTemplate.findUnique({
      where: { platform_contentType: { platform, contentType } },
    });

    // 4. 存入数据库
    const generation = await prisma.generation.create({
      data: {
        templateId: template!.id,
        topic: trimmedTopic,
        platform,
        contentType,
        rawPrompt: `System: ${systemPrompt}\n\nUser: ${userPrompt}`,
        rawResponse,
        formattedContent: JSON.stringify({ body: rawResponse }),
        temperature,
      },
    });

    return NextResponse.json({
      id: generation.id,
      topic: generation.topic,
      platform: generation.platform,
      contentType: generation.contentType,
      content: rawResponse,
      createdAt: generation.createdAt,
    });
  } catch (error) {
    console.error("/api/generate error:", error);
    const message =
      error instanceof Error ? error.message : "生成失败，请重试";
    const status =
      message.includes("未配置") ? 500 : 
      message.includes("未找到模板") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
