export const dynamic = "force-dynamic";

/**
 * Studio job creation API (queue backed).
 * POST: { type, input } -> { job }
 * Guard: none; enqueues async processing via Redis.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { enqueueStudioJob } from "@illuvrse/agent-manager";
import { AuthzError, requireSession } from "@/lib/authz";
import { checkRateLimit, resolveClientKey } from "@/lib/rateLimit";

const jobSchema = z.object({
  type: z.enum([
    "SHORT_SCRIPT",
    "SHORT_SCENES",
    "SHORT_RENDER",
    "MEME_CAPTIONS",
    "MEME_RENDER",
    "VIDEO_CLIP_EXTRACT",
    "VIDEO_TRANSCODE",
    "THUMBNAIL_GENERATE"
  ]),
  input: z.record(z.any()).optional().default({})
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let principal;
  try {
    principal = await requireSession(request);
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit({
    key: `studio:jobs:${resolveClientKey(request, principal.userId)}`,
    windowMs: 60_000,
    limit: 30
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = jobSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const project = await prisma.studioProject.findUnique({
    where: { id }
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.createdById && project.createdById !== principal.userId && principal.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const duplicateInFlight = await prisma.agentJob.findFirst({
    where: {
      projectId: project.id,
      type: parsed.data.type,
      status: { in: ["QUEUED", "PROCESSING"] }
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true }
  });
  if (duplicateInFlight) {
    return NextResponse.json(
      {
        error: "A matching job is already in progress",
        activeJobId: duplicateInFlight.id,
        activeJobCreatedAt: duplicateInFlight.createdAt.toISOString()
      },
      { status: 409 }
    );
  }

  const job = await prisma.agentJob.create({
    data: {
      projectId: project.id,
      type: parsed.data.type,
      status: "QUEUED",
      inputJson: parsed.data.input ?? {}
    }
  });

  await prisma.studioProject.update({
    where: { id: project.id },
    data: { status: "QUEUED" }
  });

  await enqueueStudioJob({
    jobId: job.id,
    projectId: project.id,
    type: parsed.data.type,
    input: parsed.data.input ?? {}
  });

  const freshJob = await prisma.agentJob.findUnique({ where: { id: job.id } });
  return NextResponse.json({ job: freshJob });
}
