export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { getMediaCorpDashboardData, triggerMediaCorpCycle } from "@/lib/media-corp/service";

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await triggerMediaCorpCycle();
  const data = await getMediaCorpDashboardData();
  return NextResponse.json({
    summary: result.summary,
    worldState: data.worldState,
    memory: data.memory
  });
}
