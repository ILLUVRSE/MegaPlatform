export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { getMediaCorpDashboardData, summarizeExecutiveState } from "@/lib/media-corp/service";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const data = await getMediaCorpDashboardData();
  return NextResponse.json({
    summary: summarizeExecutiveState(data.worldState),
    recommendations: data.worldState.strategyRecommendations
  });
}
