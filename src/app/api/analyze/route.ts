import { NextRequest, NextResponse } from "next/server";
import { analyzeContent } from "@/lib/analyze-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();
    if (!content || typeof content !== "string" || content.trim().length < 50) {
      return NextResponse.json(
        { error: "请提供至少 50 字的文案内容" },
        { status: 400 }
      );
    }

    const result = await analyzeContent(content.trim());
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "分析失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
