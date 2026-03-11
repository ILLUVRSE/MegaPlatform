export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { buildExecutiveBriefing, readLatestExecutiveBriefing } from "@/lib/executiveBriefing";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const briefing = await readLatestExecutiveBriefing();
  return NextResponse.json({ ok: true, briefing });
}

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const briefing = await buildExecutiveBriefing();
  return NextResponse.json({ ok: true, briefing });
}
