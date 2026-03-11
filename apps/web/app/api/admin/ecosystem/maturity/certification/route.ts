export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { buildAutonomousMaturityCertification } from "@/lib/autonomousMaturity";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const certification = await buildAutonomousMaturityCertification();
  return NextResponse.json({ ok: true, certification });
}
