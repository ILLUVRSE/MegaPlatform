export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { getState } from "@illuvrse/world-state";
import { evaluatePartyPresenceHealth } from "@/lib/partyPresence";
import { requireAdmin } from "@/lib/rbac";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parties = await prisma.party.findMany({
    select: {
      id: true,
      code: true,
      hostId: true,
      seats: { select: { id: true } }
    },
    take: 50
  });

  const results = await Promise.all(
    parties.map(async (party) => {
      const state = await getState(party.id, party.seats.length);
      const health = evaluatePartyPresenceHealth(state, { hostId: party.hostId });
      return {
        partyId: party.id,
        code: party.code,
        seatCount: party.seats.length,
        ...health
      };
    })
  );

  const slosMetCount = results.filter((result) => result.slosMet).length;

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    summary: {
      totalParties: results.length,
      slosMetCount,
      degradedCount: results.length - slosMetCount
    },
    presenceSLOs: results
  });
}
