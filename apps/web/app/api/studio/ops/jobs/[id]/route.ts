export const dynamic = "force-dynamic";

/**
 * Studio ops job detail API.
 * GET: -> { job, assets }
 * Guard: requireAdmin.
 */
import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { AuthzError, requireAdmin } from "@/lib/authz";

export async function GET(
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
    where: { id },
    include: {
      project: { select: { title: true } }
    }
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const assets = await prisma.studioAsset.findMany({
    where: { projectId: job.projectId },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({
    job: {
      id: job.id,
      projectId: job.projectId,
      projectTitle: job.project?.title ?? "Untitled",
      type: job.type,
      status: job.status,
      inputJson: job.inputJson,
      outputJson: job.outputJson,
      error: job.error,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString()
    },
    assets: assets.map((asset) => ({
      id: asset.id,
      kind: asset.kind,
      url: asset.url
    }))
  });
}
