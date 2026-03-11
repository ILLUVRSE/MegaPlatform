export const dynamic = "force-dynamic";

/**
 * Studio project detail API.
 * GET: -> { project, jobs, assets }
 * Guard: none; public for MVP.
 */
import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { AuthzError, requireSession } from "@/lib/authz";

export async function GET(
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

  const { id } = await params;
  const project = await prisma.studioProject.findUnique({
    where: { id }
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (project.createdById && project.createdById !== principal.userId && principal.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [jobs, assets] = await Promise.all([
    prisma.agentJob.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "asc" }
    }),
    prisma.studioAsset.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "asc" }
    })
  ]);

  return NextResponse.json({ project, jobs, assets });
}
