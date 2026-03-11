export const dynamic = "force-dynamic";

/**
 * Media shows API.
 * GET: -> { data: [{ id, title, slug, heroUrl }] }
 * Guard: none; public browsing.
 */
import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";

export async function GET() {
  const shows = await prisma.show.findMany({
    orderBy: { title: "asc" },
    select: { id: true, title: true, slug: true, heroUrl: true }
  });

  return NextResponse.json({ data: shows });
}
