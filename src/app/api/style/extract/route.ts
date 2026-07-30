import { NextRequest, NextResponse } from "next/server";
import { extractStyle } from "@/lib/style-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isUrl(s: string) {
  return /^https?:\/\//.test(s.trim());
}

async function fetchText(url: string): Promise<string> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return "";
    const html = await res.text();
    // 简单去标签提取文本
    return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "\n")
      .replace(/&nbsp;/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, 3000);
  } catch { return ""; }
}

export async function POST(request: NextRequest) {
  try {
    const { samples } = await request.json();
    if (!samples?.length || samples.length < 1) {
      return NextResponse.json({ error: "请至少提供1条文案样本或链接" }, { status: 400 });
    }

    // 如果是 URL 则 fetch，否则直接用文本
    const texts = await Promise.all(
      samples.map(async (s: string) => {
        if (isUrl(s)) {
          const text = await fetchText(s.trim());
          return text || s; // fallback to URL if fetch fails
        }
        return s;
      })
    );

    const valid = texts.filter((t: string) => t.trim().length > 20);
    if (valid.length < 1) {
      return NextResponse.json({ error: "未获取到足够的文本内容，请检查链接或直接粘贴文本" }, { status: 400 });
    }

    const profile = await extractStyle(valid);
    return NextResponse.json(profile);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "提取失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
