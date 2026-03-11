export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { readLatestGovernanceStressTestReport, runGovernanceStressTests } from "@/lib/governanceStressTests";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const report = await readLatestGovernanceStressTestReport();
  return NextResponse.json({ ok: true, report });
}

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const report = await runGovernanceStressTests();
  return NextResponse.json({ ok: report.pass, report }, { status: report.pass ? 200 : 409 });
}
