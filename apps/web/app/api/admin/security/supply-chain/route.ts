export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { evaluateSupplyChainRisk } from "@/lib/supplyChain";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = await evaluateSupplyChainRisk();
  return NextResponse.json({
    ok: true,
    ...status
  });
}
