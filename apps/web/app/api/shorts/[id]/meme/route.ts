export const dynamic = "force-dynamic";

/**
 * Meme-this API for Shorts.
 * POST: -> { projectId }
 * Guard: none; creates a MEME project and enqueues clip + thumbnail + meme render.
 */
import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { enqueueStudioJob } from "@illuvrse/agent-manager";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const ANON_COOKIE = "ILLUVRSE_ANON_ID";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const post = await prisma.shortPost.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "Short not found" }, { status: 404 });
  }

  if (post.isPremium) {
    const session = await getServerSession(authOptions);
    const buyerId = session?.user?.id ?? null;
    let buyerAnonId: string | null = null;
    if (!buyerId) {
      const cookie = request.headers.get("cookie") ?? "";
      const match = cookie.match(new RegExp(`${ANON_COOKIE}=([^;]+)`));
      buyerAnonId = match?.[1] ?? null;
    }
    const purchase = await prisma.shortPurchase.findFirst({
      where: {
        shortPostId: id,
        ...(buyerId ? { buyerId } : { buyerAnonId })
      },
      select: { id: true }
    });
    if (!purchase) {
      return NextResponse.json({ error: "Purchase required" }, { status: 402 });
    }
  }

  const project = await prisma.studioProject.create({
    data: {
      type: "MEME",
      title: `Meme: ${post.title}`,
      description: post.caption,
      status: "QUEUED"
    }
  });

  let sourceUrl = post.mediaUrl;
  if (post.projectId) {
    const sourceAsset = await prisma.studioAsset.findFirst({
      where: { projectId: post.projectId, kind: "SHORT_MP4" },
      orderBy: { createdAt: "desc" }
    });
    if (sourceAsset) sourceUrl = sourceAsset.url;
  }

  if (post.mediaType === "IMAGE") {
    const memeJob = await prisma.agentJob.create({
      data: {
        projectId: project.id,
        type: "MEME_RENDER",
        status: "QUEUED",
        inputJson: { sourceUrl, caption: post.caption ?? "ILLUVRSE" }
      }
    });

    await enqueueStudioJob({
      jobId: memeJob.id,
      projectId: project.id,
      type: "MEME_RENDER",
      input: { sourceUrl, caption: post.caption ?? "ILLUVRSE" }
    });
  } else {
    const clipJob = await prisma.agentJob.create({
      data: {
        projectId: project.id,
        type: "VIDEO_CLIP_EXTRACT",
        status: "QUEUED",
        inputJson: { sourceUrl, caption: post.caption ?? "ILLUVRSE" }
      }
    });

    const thumbJob = await prisma.agentJob.create({
      data: {
        projectId: project.id,
        type: "THUMBNAIL_GENERATE",
        status: "QUEUED",
        inputJson: { sourceUrl, caption: post.caption, title: post.title }
      }
    });

    await enqueueStudioJob({
      jobId: clipJob.id,
      projectId: project.id,
      type: "VIDEO_CLIP_EXTRACT",
      input: { sourceUrl, caption: post.caption ?? "ILLUVRSE" }
    });

    await enqueueStudioJob({
      jobId: thumbJob.id,
      projectId: project.id,
      type: "THUMBNAIL_GENERATE",
      input: { sourceUrl, caption: post.caption, title: post.title }
    });
  }

  return NextResponse.json({ projectId: project.id });
}
