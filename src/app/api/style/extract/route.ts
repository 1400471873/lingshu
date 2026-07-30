import { NextRequest, NextResponse } from "next/server";
import { extractStyle } from "@/lib/style-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { samples } = await request.json();
    if (!samples?.length || samples.length < 3) {
      return NextResponse.json({ error: "请至少提供3条文案样本" }, { status: 400 });
    }
    const profile = await extractStyle(samples);
    return NextResponse.json(profile);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "提取失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
