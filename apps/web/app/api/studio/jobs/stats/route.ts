export const dynamic = "force-dynamic";

/**
 * Studio job stats endpoint.
 * GET: -> { totals, byStatus, byType }
 * Guard: requireAdmin; returns aggregate counts for observability.
 */
import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { getStudioQueue } from "@illuvrse/agent-manager";
import { AuthzError, requireAdmin } from "@/lib/authz";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const totals = await prisma.agentJob.count();
  const groupedStatus = await prisma.agentJob.groupBy({
    by: ["status"],
    _count: { status: true }
  });
  const groupedType = await prisma.agentJob.groupBy({
    by: ["type"],
    _count: { type: true }
  });
  const recentJobs = await prisma.agentJob.findMany({
    where: {
      OR: [{ status: "COMPLETED" }, { status: "FAILED" }]
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
    select: { id: true, type: true, status: true, outputJson: true, error: true, updatedAt: true }
  });

  const byStatus = groupedStatus.reduce((acc, row) => {
    acc[row.status] = row._count.status;
    return acc;
  }, {} as Record<string, number>);
  const byType = groupedType.reduce((acc, row) => {
    acc[row.type] = row._count.type;
    return acc;
  }, {} as Record<string, number>);

  const durations = recentJobs
    .filter((job) => job.status === "COMPLETED")
    .map((job) => {
      const value = (job.outputJson as { durationMs?: number } | null)?.durationMs;
      return typeof value === "number" ? value : null;
    })
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
  const avgDurationMs =
    durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;
  const p95DurationMs =
    durations.length > 0 ? durations[Math.floor(durations.length * 0.95) - 1] ?? durations.at(-1) : null;

  let queueCounts: Record<string, number> | null = null;
  try {
    const queue = getStudioQueue();
    queueCounts = await queue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused");
  } catch {
    queueCounts = null;
  }

  const attempts = recentJobs
    .map((job) => (job.outputJson as { attempts?: number } | null)?.attempts)
    .filter((value): value is number => typeof value === "number");
  const avgAttempts = attempts.length > 0 ? Number((attempts.reduce((sum, value) => sum + value, 0) / attempts.length).toFixed(2)) : null;
  const retryingJobs = recentJobs.filter((job) => {
    const output = (job.outputJson as { retryable?: boolean } | null) ?? null;
    return output?.retryable === true && job.status !== "COMPLETED";
  }).length;
  const failedJobs = recentJobs.filter((job) => job.status === "FAILED").length;
  const failureRate = recentJobs.length > 0 ? Number((failedJobs / recentJobs.length).toFixed(3)) : 0;

  const recentFailures = recentJobs
    .filter((job) => job.status === "FAILED")
    .slice(0, 10)
    .map((job) => ({
      id: job.id,
      type: job.type,
      error: job.error,
      updatedAt: job.updatedAt.toISOString()
    }));

  const completedTypeBuckets = new Map<string, number[]>();
  for (const job of recentJobs) {
    if (job.status !== "COMPLETED") continue;
    const duration = (job.outputJson as { durationMs?: number } | null)?.durationMs;
    if (typeof duration !== "number" || duration <= 0) continue;
    const bucket = completedTypeBuckets.get(job.type) ?? [];
    bucket.push(duration);
    completedTypeBuckets.set(job.type, bucket);
  }
  const byTypeLatency = Array.from(completedTypeBuckets.entries()).reduce((acc, [type, values]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const avg = Math.round(sorted.reduce((sum, value) => sum + value, 0) / sorted.length);
    const p95 = sorted[Math.floor(sorted.length * 0.95) - 1] ?? sorted.at(-1) ?? null;
    acc[type] = { avgDurationMs: avg, p95DurationMs: p95, samples: sorted.length };
    return acc;
  }, {} as Record<string, { avgDurationMs: number; p95DurationMs: number | null; samples: number }>);

  return NextResponse.json({
    totals,
    byStatus,
    byType,
    queueCounts,
    avgDurationMs,
    p95DurationMs,
    avgAttempts,
    retryingJobs,
    failureRate,
    recentFailures,
    byTypeLatency
  });
}
