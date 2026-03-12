export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";
import { buildServiceDependencyHealth, buildSloStatus } from "@/lib/platformGovernance";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [snapshot, dependencyHealth] = await Promise.all([
    buildSloStatus(prisma),
    buildServiceDependencyHealth(prisma)
  ]);
  return NextResponse.json({
    ok: true,
    timestamp: snapshot.generatedAt,
    runbook: "docs/ops_brain/runbooks/incident-response.md",
    sloSummaries: snapshot.slos,
    serviceHealth: dependencyHealth.dependencies,
    serviceHealthSummary: dependencyHealth.summary,
    ...snapshot,
    dependencyHealth
  });
}
