import { NextRequest, NextResponse } from "next/server";
import { createStyle, listStyles, deleteStyle } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const styles = await listStyles();
  return NextResponse.json({ styles });
}

export async function POST(request: NextRequest) {
  const { name, samples } = await request.json();
  if (!name || !samples?.length) {
    return NextResponse.json({ error: "请提供名称和至少1条文案样本" }, { status: 400 });
  }
  const style = await createStyle(name, samples, {});
  return NextResponse.json(style);
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  await deleteStyle(id);
  return NextResponse.json({ success: true });
}
