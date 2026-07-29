import { NextRequest, NextResponse } from "next/server";
import { getGeneration, updateGeneration, deleteGeneration } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const record = await getGeneration(params.id);
  if (!record) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }

  const r = record as any;
  let content = r.rawResponse || "";
  try {
    const parsed = JSON.parse(r.formattedContent || "{}");
    content = parsed.body || r.rawResponse || "";
  } catch { /* ignore */ }

  return NextResponse.json({
    id: r.id, topic: r.topic, platform: r.platform,
    contentType: r.contentType, content, createdAt: r.createdAt,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { content } = body;
  if (typeof content !== "string") {
    return NextResponse.json({ error: "content 必须是字符串" }, { status: 400 });
  }
  const existing = await getGeneration(params.id);
  if (!existing) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }
  await updateGeneration(params.id, content);
  return NextResponse.json({ id: params.id, content });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const existing = await getGeneration(params.id);
  if (!existing) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }
  await deleteGeneration(params.id);
  return NextResponse.json({ success: true });
}
