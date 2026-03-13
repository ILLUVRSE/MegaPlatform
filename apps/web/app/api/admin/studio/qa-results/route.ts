export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";

type QaOutcomeJson = {
  status?: "PASS" | "FAIL";
  passed?: boolean;
  checksRun?: string[];
  reporterId?: string | null;
  timestamp?: string;
};

type QaIssuesJson = {
  issues?: string[];
  outcome?: QaOutcomeJson | null;
};

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId")?.trim() ?? "";
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const results = await prisma.contentQaResult.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({
    data: results.map((result) => {
      const audit = ((result.issuesJson as QaIssuesJson | null) ?? null);
      const outcome = audit?.outcome ?? null;
      const checksRun = Array.isArray(outcome?.checksRun) ? outcome.checksRun : [];
      const issues = Array.isArray(audit?.issues) ? audit.issues : [];

      return {
        id: result.id,
        projectId: result.projectId,
        status: result.status,
        technicalScore: result.technicalScore,
        policyScore: result.policyScore,
        issues,
        checkedBy: result.checkedBy,
        reporterId: outcome?.reporterId ?? null,
        checksRun,
        timestamp: outcome?.timestamp ?? result.createdAt.toISOString(),
        outcome: outcome ?? {
          status: result.status,
          passed: result.status === "PASS",
          checksRun,
          reporterId: null,
          timestamp: result.createdAt.toISOString()
        },
        createdAt: result.createdAt
      };
    })
  });
}
