import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

  const where = search
    ? { topic: { contains: search } }
    : {};

  const [total, items] = await Promise.all([
    prisma.generation.count({ where }),
    prisma.generation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        topic: true,
        platform: true,
        contentType: true,
        createdAt: true,
      },
    }),
  ]);

  // Parse formattedContent to extract body preview
  const list = await Promise.all(
    items.map(async (item) => {
      const gen = await prisma.generation.findUnique({
        where: { id: item.id },
        select: { formattedContent: true },
      });
      let preview = "";
      try {
        const parsed = JSON.parse(gen?.formattedContent || "{}");
        preview = (parsed.body || "").slice(0, 120);
      } catch {
        preview = "";
      }
      return {
        ...item,
        preview,
      };
    })
  );

  return NextResponse.json({
    list,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
