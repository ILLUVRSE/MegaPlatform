export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";

type CountRow = { event: string; count: bigint };

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await prisma.$queryRaw<CountRow[]>`
    SELECT "event" AS event, COUNT(*)::bigint AS count
    FROM "PlatformEvent"
    WHERE "createdAt" >= ${since}
      AND "event" IN ('onboarding_started', 'onboarding_completed', 'onboarding_first_action', 'ux_hesitation', 'ux_rage_click', 'ux_dropoff')
    GROUP BY "event"
  `;

  const counts = Object.fromEntries(rows.map((row) => [row.event, Number(row.count)])) as Record<string, number>;
  const started = counts.onboarding_started ?? 0;
  const completed = counts.onboarding_completed ?? 0;
  const firstAction = counts.onboarding_first_action ?? 0;

  return NextResponse.json({
    ok: true,
    window: "7d",
    generatedAt: new Date().toISOString(),
    onboarding: {
      started,
      completed,
      firstAction,
      completionRate: started > 0 ? completed / started : 0,
      firstActionRate: started > 0 ? firstAction / started : 0
    },
    friction: {
      hesitation: counts.ux_hesitation ?? 0,
      rageClick: counts.ux_rage_click ?? 0,
      dropoff: counts.ux_dropoff ?? 0
    }
  });
}
