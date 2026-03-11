import { NextResponse } from "next/server";
import { searchPlatform } from "@/lib/platformSearch";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const results = await searchPlatform(query);
  return NextResponse.json({ ok: true, query, results });
}
