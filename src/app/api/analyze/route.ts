import { NextRequest, NextResponse } from "next/server";
import { analyzeContent } from "@/lib/analyze-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isURL(text: string): boolean {
  return /^https?:\/\/\S+/.test(text.trim());
}

async function fetchText(url: string): Promise<string> {
  // 只抓取公开网页（公众号、知乎等）
  const blocked = ["xiaohongshu.com", "douyin.com", "bilibili.com"];
  const host = new URL(url).hostname;
  if (blocked.some((b) => host.includes(b))) {
    throw new Error(`该平台需手动复制文本后粘贴。请在 App 内点"转发→复制链接/文本"，然后粘贴纯文本内容`);
  }

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Lingshu/1.0)" },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) throw new Error(`无法访问该链接 (HTTP ${res.status})`);

  const html = await res.text();
  // 简单提取正文：去掉 HTML 标签
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&\w+;/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 20)
    .join("\n")
    .slice(0, 3000);

  if (text.length < 50) throw new Error("未能从链接中提取到足够文本，请手动复制粘贴");

  return text;
}

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();
    const raw = content?.trim();
    if (!raw || typeof raw !== "string") {
      return NextResponse.json({ error: "请输入内容或链接" }, { status: 400 });
    }

    let text = raw;
    let source = "text";

    if (isURL(raw)) {
      try {
        text = await fetchText(raw);
        source = "url";
      } catch (err) {
        const message = err instanceof Error ? err.message : "获取失败";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    if (text.length < 50) {
      return NextResponse.json(
        { error: "内容不足 50 字，无法分析" },
        { status: 400 }
      );
    }

    const result = await analyzeContent(text);
    return NextResponse.json({ ...result, source });
  } catch (error) {
    const message = error instanceof Error ? error.message : "分析失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
