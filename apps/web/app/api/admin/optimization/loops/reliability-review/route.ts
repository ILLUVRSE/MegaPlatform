export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { buildAutonomousLoopReliabilityReview } from "@/lib/autonomousLoopReview";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const review = await buildAutonomousLoopReliabilityReview();
  return NextResponse.json({ ok: true, ...review });
}
