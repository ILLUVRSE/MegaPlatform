export const dynamic = "force-dynamic";

/**
 * Studio ops job cancel API.
 * POST: -> { ok: true }
 * Guard: requireAdmin.
 */
import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { getStudioQueue } from "@illuvrse/agent-manager";
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

  await prisma.agentJob.update({
    where: { id },
    data: {
      status: "FAILED",
      error: "Cancelled"
    }
  });

  try {
    const queue = getStudioQueue();
    await queue.remove(id);
  } catch {
    // ignore queue removal errors
  }

  return NextResponse.json({ ok: true });
}
