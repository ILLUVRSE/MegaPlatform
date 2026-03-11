export const dynamic = "force-dynamic";

/**
 * Party seat reservation API.
 * POST: { seatIndex, refresh? } -> { seatIndex, state }
 * Guard: authenticated; validates seat exists and is not locked.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { reserveSeat } from "@illuvrse/world-state";
import { AuthzError, requireSession } from "@/lib/authz";

const RESERVATION_TTL_MS = 30_000;

const reserveSchema = z.object({
  seatIndex: z.number().int().min(1),
  refresh: z.boolean().optional()
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  let principal;
  try {
    principal = await requireSession(request);
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await params;
  const body = await request.json();
  const parsed = reserveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const party = await prisma.party.findUnique({
    where: { code },
    include: { seats: true }
  });

  if (!party) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  const seat = party.seats.find((entry) => entry.seatIndex === parsed.data.seatIndex);
  if (!seat) {
    return NextResponse.json({ error: "Seat not found" }, { status: 404 });
  }

  if (seat.locked) {
    return NextResponse.json({ error: "Seat locked" }, { status: 409 });
  }

  const result = await reserveSeat(
    party.id,
    parsed.data.seatIndex,
    principal.userId,
    RESERVATION_TTL_MS,
    party.seats.length
  );

  if (!result.ok) {
    return NextResponse.json({ error: "Seat already reserved" }, { status: 409 });
  }

  return NextResponse.json({ seatIndex: parsed.data.seatIndex, state: "reserved" });
}
