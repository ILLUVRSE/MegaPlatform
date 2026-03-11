export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { runGovernanceTamperScan } from "@/lib/governanceTamperDetection";

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await runGovernanceTamperScan();
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });

  return NextResponse.json({ ok: true, result }, { status: result.tamperDetected ? 409 : 200 });
}
