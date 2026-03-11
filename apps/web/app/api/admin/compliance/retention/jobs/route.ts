export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { loadRetentionEvidence, loadRetentionPolicies, runRetentionJobs } from "@/lib/dataRetention";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [policies, evidence] = await Promise.all([loadRetentionPolicies(), loadRetentionEvidence()]);
  return NextResponse.json({
    ok: true,
    policies,
    evidence
  });
}

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobs = await runRetentionJobs();
  await writeAudit(
    auth.session.user.id,
    "RETENTION_JOBS_RUN",
    JSON.stringify({
      jobs: jobs.length,
      failed: jobs.filter((job) => job.status === "fail").length
    })
  );

  return NextResponse.json({
    ok: true,
    jobs
  });
}
