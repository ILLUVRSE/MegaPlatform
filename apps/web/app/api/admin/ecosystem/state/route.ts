export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { buildEcosystemStateModel } from "@/lib/ecosystemStateModel";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const state = await buildEcosystemStateModel();
  return NextResponse.json({ ok: true, state });
}
