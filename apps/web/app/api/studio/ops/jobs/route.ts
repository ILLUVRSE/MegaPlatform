export const dynamic = "force-dynamic";

/**
 * Studio ops jobs API.
 * GET: ?status=FAILED&type=...&sinceHours=24&limit=50 -> { jobs }
 * Guard: requireAdmin.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { AuthzError, requireAdmin } from "@/lib/authz";

const STATUS_VALUES = ["QUEUED", "PROCESSING", "COMPLETED", "FAILED"] as const;
const TYPE_VALUES = [
  "SHORT_SCRIPT",
  "SHORT_SCENES",
  "SHORT_RENDER",
  "MEME_CAPTIONS",
  "MEME_RENDER",
  "VIDEO_CLIP_EXTRACT",
  "VIDEO_TRANSCODE",
  "THUMBNAIL_GENERATE"
] as const;

const querySchema = z.object({
  status: z.enum(STATUS_VALUES).default("FAILED"),
  type: z.enum(TYPE_VALUES).optional(),
  sinceHours: z.coerce.number().int().min(1).max(24 * 30).default(24),
  limit: z.coerce.number().int().min(1).max(200).default(50)
});

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    status: searchParams.get("status") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    sinceHours: searchParams.get("sinceHours") ?? undefined,
    limit: searchParams.get("limit") ?? undefined
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const since = new Date(Date.now() - parsed.data.sinceHours * 60 * 60 * 1000);

  const jobs = await prisma.agentJob.findMany({
    where: {
      status: parsed.data.status,
      type: parsed.data.type,
      createdAt: { gte: since }
    },
    orderBy: { createdAt: "desc" },
    take: parsed.data.limit,
    include: {
      project: { select: { title: true } }
    }
  });

  const responseJobs = jobs.map((job) => {
    const outputJson = job.outputJson as Record<string, unknown> | null;
    const attempts = typeof outputJson?.attempts === "number" ? outputJson.attempts : 1;
    const maxAttempts = typeof outputJson?.maxAttempts === "number" ? outputJson.maxAttempts : null;
    const retryable = outputJson?.retryable === true;
    const nextRetryAt = typeof outputJson?.nextRetryAt === "string" ? outputJson.nextRetryAt : null;
    const durationMs = job.updatedAt.getTime() - job.createdAt.getTime();

    return {
      id: job.id,
      projectId: job.projectId,
      projectTitle: job.project?.title ?? "Untitled",
      type: job.type,
      status: job.status,
      attempts,
      maxAttempts,
      retryable,
      nextRetryAt,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      durationMs: durationMs > 0 ? durationMs : null,
      error: job.error ?? null
    };
  });

  return NextResponse.json({ jobs: responseJobs });
}
