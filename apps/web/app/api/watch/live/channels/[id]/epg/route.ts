export const dynamic = "force-dynamic";

/**
 * Watch live channel EPG API.
 * GET: -> { programs }
 * Guard: none.
 */
import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const programs = await prisma.liveProgram.findMany({
    where: { channelId: id },
    orderBy: { startsAt: "asc" }
  });

  return NextResponse.json({
    programs: programs.map((program) => ({
      id: program.id,
      title: program.title,
      description: program.description,
      startsAt: program.startsAt,
      endsAt: program.endsAt
    }))
  });
}
