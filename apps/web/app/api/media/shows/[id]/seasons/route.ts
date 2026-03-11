export const dynamic = "force-dynamic";

/**
 * Media seasons API for a show.
 * GET: -> { data: [{ id, number, title }] }
 * Guard: none; public browsing.
 */
import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const seasons = await prisma.season.findMany({
    where: { showId: id },
    orderBy: { number: "asc" },
    select: { id: true, number: true, title: true }
  });

  return NextResponse.json({ data: seasons });
}
