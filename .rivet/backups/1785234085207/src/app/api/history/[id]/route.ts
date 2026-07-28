import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { content } = body;

    if (typeof content !== "string") {
      return NextResponse.json({ error: "content 必须是字符串" }, { status: 400 });
    }

    const existing = await prisma.generation.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }

    const updated = await prisma.generation.update({
      where: { id: params.id },
      data: {
        formattedContent: JSON.stringify({ body: content }),
        rawResponse: content,
      },
    });

    return NextResponse.json({
      id: updated.id,
      content,
      updatedAt: updated.createdAt,
    });
  } catch (error) {
    console.error("PATCH /api/history/[id] error:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
