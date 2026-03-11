export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { selectAdaptiveGoals } from "@/lib/adaptiveGoalSelection";

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const selection = await selectAdaptiveGoals();
  return NextResponse.json({ ok: true, selection });
}
