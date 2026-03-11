export const dynamic = "force-dynamic";

/**
 * Studio ops job retry API.
 * POST: -> { ok: true, newJobId }
 * Guard: requireAdmin.
 */
import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { enqueueStudioJob } from "@illuvrse/agent-manager";
import { AuthzError, requireAdmin } from "@/lib/authz";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const job = await prisma.agentJob.findUnique({
    where: { id }
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status !== "FAILED") {
    return NextResponse.json({ error: "Only failed jobs can be retried" }, { status: 409 });
  }

  const duplicateInFlight = await prisma.agentJob.findFirst({
    where: {
      projectId: job.projectId,
      type: job.type,
      status: { in: ["QUEUED", "PROCESSING"] }
    },
    orderBy: { createdAt: "desc" },
    select: { id: true }
  });
  if (duplicateInFlight) {
    return NextResponse.json(
      { error: "An in-flight retry already exists for this job type", activeJobId: duplicateInFlight.id },
      { status: 409 }
    );
  }

  const previousInput =
    typeof job.inputJson === "object" && job.inputJson !== null
      ? (job.inputJson as Record<string, unknown>)
      : {};

  const newJob = await prisma.agentJob.create({
    data: {
      projectId: job.projectId,
      type: job.type,
      status: "QUEUED",
      inputJson: {
        ...previousInput,
        retriedFromJobId: job.id,
        retryRequestedAt: new Date().toISOString()
      }
    }
  });

  await prisma.studioProject.update({
    where: { id: job.projectId },
    data: { status: "QUEUED" }
  });

  await enqueueStudioJob({
    jobId: newJob.id,
    projectId: newJob.projectId,
    type: newJob.type,
    input: (newJob.inputJson as Record<string, unknown>) ?? {}
  });

  return NextResponse.json({ ok: true, newJobId: newJob.id });
}
