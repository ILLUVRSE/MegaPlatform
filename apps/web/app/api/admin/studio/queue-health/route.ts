export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { getStudioQueue } from "@illuvrse/agent-manager";
import { AuthzError, requireAdmin } from "@/lib/authz";

function percentile(values: number[], ratio: number) {
  if (values.length === 0) return null;
  const index = Math.max(0, Math.ceil(values.length * ratio) - 1);
  return values[index] ?? values.at(-1) ?? null;
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [totalJobs, groupedStatus, groupedType, retryingJobs, failedLast24h, recentJobs] = await Promise.all([
    prisma.agentJob.count(),
    prisma.agentJob.groupBy({
      by: ["status"],
      _count: { status: true }
    }),
    prisma.agentJob.groupBy({
      by: ["type"],
      _count: { type: true }
    }),
    prisma.agentJob.count({
      where: {
        outputJson: {
          path: ["retryable"],
          equals: true
        },
        status: { in: ["QUEUED", "PROCESSING"] }
      }
    }),
    prisma.agentJob.count({
      where: {
        status: "FAILED",
        updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    }),
    prisma.agentJob.findMany({
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true,
        projectId: true,
        type: true,
        status: true,
        error: true,
        outputJson: true,
        createdAt: true,
        updatedAt: true
      }
    })
  ]);

  let queueCounts: Record<string, number> | null = null;
  try {
    const queue = getStudioQueue();
    queueCounts = await queue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused");
  } catch {
    queueCounts = null;
  }

  const byStatus = groupedStatus.reduce((acc, row) => {
    acc[row.status] = row._count.status;
    return acc;
  }, {} as Record<string, number>);
  const byType = groupedType.reduce((acc, row) => {
    acc[row.type] = row._count.type;
    return acc;
  }, {} as Record<string, number>);

  const durationSamples = recentJobs
    .map((job) => {
      const output = (job.outputJson as { durationMs?: number } | null) ?? null;
      if (typeof output?.durationMs === "number" && output.durationMs > 0) {
        return output.durationMs;
      }
      const derived = job.updatedAt.getTime() - job.createdAt.getTime();
      return derived > 0 ? derived : null;
    })
    .filter((value): value is number => value !== null)
    .sort((left, right) => left - right);

  const recentErrors = recentJobs
    .filter((job) => {
      const output = (job.outputJson as { retryable?: boolean } | null) ?? null;
      return job.status === "FAILED" || output?.retryable === true;
    })
    .slice(0, 10)
    .map((job) => {
      const output = (job.outputJson as {
        attempts?: number;
        maxAttempts?: number;
        retryable?: boolean;
        lastError?: string;
        nextRetryAt?: string;
      } | null) ?? null;
      return {
        id: job.id,
        projectId: job.projectId,
        type: job.type,
        status: job.status,
        attempts: output?.attempts ?? 1,
        maxAttempts: output?.maxAttempts ?? null,
        retryable: output?.retryable ?? false,
        lastError: output?.lastError ?? job.error ?? null,
        nextRetryAt: output?.nextRetryAt ?? null,
        updatedAt: job.updatedAt.toISOString()
      };
    });

  const latencyByType = recentJobs.reduce((acc, job) => {
    const output = (job.outputJson as { durationMs?: number } | null) ?? null;
    const durationMs =
      typeof output?.durationMs === "number" && output.durationMs > 0
        ? output.durationMs
        : job.updatedAt.getTime() - job.createdAt.getTime();
    if (durationMs <= 0) return acc;
    const bucket = acc.get(job.type) ?? [];
    bucket.push(durationMs);
    acc.set(job.type, bucket);
    return acc;
  }, new Map<string, number[]>());

  const byTypeLatency = Array.from(latencyByType.entries()).reduce((acc, [type, samples]) => {
    const sorted = [...samples].sort((left, right) => left - right);
    const avgDurationMs = Math.round(sorted.reduce((sum, value) => sum + value, 0) / sorted.length);
    acc[type] = {
      avgDurationMs,
      p95DurationMs: percentile(sorted, 0.95),
      samples: sorted.length
    };
    return acc;
  }, {} as Record<string, { avgDurationMs: number; p95DurationMs: number | null; samples: number }>);

  return NextResponse.json({
    counts: {
      total: totalJobs,
      byStatus,
      byType,
      retrying: retryingJobs,
      failedLast24h
    },
    queue: queueCounts,
    indicators: {
      hasRetriesInFlight: retryingJobs > 0,
      hasFailuresLast24h: failedLast24h > 0
    },
    latencies: {
      avgDurationMs:
        durationSamples.length > 0
          ? Math.round(durationSamples.reduce((sum, value) => sum + value, 0) / durationSamples.length)
          : null,
      p95DurationMs: percentile(durationSamples, 0.95),
      byType: byTypeLatency
    },
    recentErrors
  });
}
