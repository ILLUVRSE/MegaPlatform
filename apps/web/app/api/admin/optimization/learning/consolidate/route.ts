export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { consolidateLearningMemory } from "@/lib/learningConsolidation";

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await consolidateLearningMemory();
  await writeAudit(
    auth.session.user.id,
    "LEARNING_MEMORY_CONSOLIDATED",
    JSON.stringify({
      promoted: result.promoted.length
    })
  );

  return NextResponse.json({
    ok: true,
    ...result
  });
}
