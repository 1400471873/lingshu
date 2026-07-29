import { NextRequest, NextResponse } from "next/server";
import { listGenerations } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

  const data = await listGenerations(search, page, limit);
  return NextResponse.json(data);
}
