export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { buildTrustworthyAiOperationsScore } from "@/lib/trustworthyAiScore";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const score = await buildTrustworthyAiOperationsScore();
  return NextResponse.json({ ok: true, score });
}
