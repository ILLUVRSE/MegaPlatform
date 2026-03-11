export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";

type AttributionRow = {
  creatorprofileid: string;
  actiontype: string;
  totalcents: bigint;
  events: bigint;
};

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await prisma.$queryRaw<AttributionRow[]>`
    SELECT "creatorProfileId" AS creatorProfileId,
           "actionType" AS actionType,
           SUM("revenueCents")::bigint AS totalCents,
           COUNT(*)::bigint AS events
    FROM "RevenueAttribution"
    WHERE "occurredAt" >= ${since}
    GROUP BY "creatorProfileId", "actionType"
    ORDER BY totalCents DESC
    LIMIT 200
  `;

  const byCreator = new Map<string, { creatorProfileId: string; totalCents: number; actions: { actionType: string; events: number; revenueCents: number }[] }>();
  for (const row of rows) {
    const creatorProfileId = row.creatorprofileid;
    const actionType = row.actiontype;
    const totalCents = Number(row.totalcents);
    const events = Number(row.events);
    const existing =
      byCreator.get(creatorProfileId) ??
      { creatorProfileId, totalCents: 0, actions: [] };
    existing.totalCents += totalCents;
    existing.actions.push({ actionType, events, revenueCents: totalCents });
    byCreator.set(creatorProfileId, existing);
  }

  const creators = [...byCreator.values()].sort((a, b) => b.totalCents - a.totalCents);
  const totals = creators.reduce(
    (acc, row) => {
      acc.revenueCents += row.totalCents;
      acc.creatorCount += 1;
      acc.events += row.actions.reduce((sum, action) => sum + action.events, 0);
      return acc;
    },
    { revenueCents: 0, creatorCount: 0, events: 0 }
  );

  return NextResponse.json({
    ok: true,
    window: "30d",
    generatedAt: new Date().toISOString(),
    totals,
    creators
  });
}
