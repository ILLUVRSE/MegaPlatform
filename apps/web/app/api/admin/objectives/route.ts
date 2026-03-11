export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { loadObjectives } from "@/lib/objectives";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const objectives = await loadObjectives();
  return NextResponse.json({
    ok: true,
    objectives,
    generatedAt: new Date().toISOString()
  });
}
