export const dynamic = "force-dynamic";

/**
 * Party seat lock API.
 * POST: { seatIndex, locked, occupantId? } -> { seatIndex, state }
 * Guard: host-only (authenticated principal).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { lockSeat, unlockSeat } from "@illuvrse/world-state";
import { AuthzError, requireSession } from "@/lib/authz";
import { checkRateLimit, resolveClientKey } from "@/lib/rateLimit";

const lockSchema = z.object({
  seatIndex: z.number().int().min(1),
  locked: z.boolean(),
  occupantId: z.string().optional().nullable()
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

  const rateLimit = await checkRateLimit({
    key: `party:lock:${resolveClientKey(request, principal.userId)}`,
    windowMs: 60_000,
    limit: 60
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { code } = await params;
  const body = await request.json();
  const parsed = lockSchema.safeParse(body);
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

  if (party.hostId !== principal.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const seat = party.seats.find((entry) => entry.seatIndex === parsed.data.seatIndex);
  if (!seat) {
    return NextResponse.json({ error: "Seat not found" }, { status: 404 });
  }

  await prisma.seat.update({
    where: { id: seat.id },
    data: {
      locked: parsed.data.locked,
      occupantId: parsed.data.locked ? parsed.data.occupantId ?? seat.occupantId : null
    }
  });

  if (parsed.data.locked) {
    await lockSeat(party.id, parsed.data.seatIndex, party.seats.length, parsed.data.occupantId ?? null);
    return NextResponse.json({ seatIndex: parsed.data.seatIndex, state: "locked" });
  }

  await unlockSeat(party.id, parsed.data.seatIndex, party.seats.length);
  return NextResponse.json({ seatIndex: parsed.data.seatIndex, state: "available" });
}
