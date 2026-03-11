export const dynamic = "force-dynamic";

/**
 * Media episodes API for a season.
 * GET: -> { data: [{ id, title, assetUrl, lengthSeconds }] }
 * Guard: none; public browsing.
 */
import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const episodes = await prisma.episode.findMany({
    where: { seasonId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, assetUrl: true, lengthSeconds: true }
  });

  return NextResponse.json({ data: episodes });
}
