export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { evaluateOrganismModeActivation, readOrganismModeStatus } from "@/lib/organismMode";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = await readOrganismModeStatus();
  return NextResponse.json({ ok: true, status });
}

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = await evaluateOrganismModeActivation();
  return NextResponse.json({ ok: status.active, status }, { status: status.active ? 200 : 409 });
}
