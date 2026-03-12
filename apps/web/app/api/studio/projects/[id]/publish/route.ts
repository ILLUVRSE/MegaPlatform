export const dynamic = "force-dynamic";

/**
 * Studio project publish API.
 * POST: { title?, caption? } -> { post }
 * Guard: authenticated owner/admin.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, prisma } from "@illuvrse/db";
import { AuthzError, requireSession } from "@/lib/authz";
import { ensureCreatorProfile } from "@/lib/creatorIdentity";
import { evaluateContentQa } from "@/lib/contentQa";

const publishSchema = z.object({
  title: z.string().optional(),
  caption: z.string().optional()
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

  const { id } = await params;
  const body = await request.json();
  const parsed = publishSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const project = await prisma.studioProject.findUnique({
    where: { id },
    include: { assets: true }
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (project.createdById && project.createdById !== principal.userId && principal.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const reversedAssets = [...project.assets].reverse();
  const asset = reversedAssets.find((item) => {
    if (project.type === "SHORT") return item.kind === "HLS_MANIFEST";
    if (project.type === "MEME") return item.kind === "MEME_PNG";
    return false;
  }) ?? reversedAssets.find((item) => {
    if (project.type === "SHORT") return item.kind === "SHORT_MP4";
    if (project.type === "MEME") return item.kind === "MEME_PNG";
    return false;
  });

  if (!asset) {
    return NextResponse.json({ error: "No render asset available" }, { status: 409 });
  }

  const resolvedCaption = parsed.data.caption ?? project.description ?? "";
  const qaResult = evaluateContentQa({
    projectType: project.type,
    caption: resolvedCaption,
    assetKinds: project.assets.map((item) => item.kind),
    assetCount: project.assets.length
  });

  await prisma.contentQaResult.create({
      data: {
      projectId: project.id,
      status: qaResult.status as "PASS" | "FAIL",
      technicalScore: qaResult.technicalScore,
      policyScore: qaResult.policyScore,
      issuesJson: qaResult.issues
    }
  });

  if (qaResult.status !== "PASS") {
    return NextResponse.json(
      { error: "Publish blocked by content QA.", issues: qaResult.issues },
      { status: 409 }
    );
  }

  const creatorUser = await prisma.user.findUnique({
    where: { id: principal.userId },
    select: { id: true, name: true, email: true }
  });
  const createdById = creatorUser?.id ?? null;
  const creatorProfile = creatorUser ? await ensureCreatorProfile(creatorUser).catch(() => null) : null;

  const post = await prisma.shortPost.create({
    data: {
      projectId: project.id,
      title: parsed.data.title ?? project.title,
      caption: resolvedCaption,
      mediaUrl: asset.url,
      mediaType: project.type === "MEME" ? "IMAGE" : "VIDEO",
      createdById,
      publishedAt: new Date()
    }
  });

  const feedType = project.type === "MEME" ? "MEME" : "SHORT";
  const existingFeedPost = await prisma.feedPost.findFirst({
    where: {
      shortPostId: post.id,
      type: { in: ["SHORT", "MEME"] },
      shareOfId: null
    },
    select: { id: true }
  });

  if (existingFeedPost) {
    await prisma.feedPost.update({
      where: { id: existingFeedPost.id },
      data: {
        type: feedType,
        caption: post.caption,
        authorId: post.createdById,
        authorProfile: creatorProfile?.displayName ?? principal.name ?? "Creator"
      }
    });
  } else {
    await prisma.feedPost.create({
      data: {
        type: feedType,
        caption: post.caption,
        authorId: post.createdById,
        authorProfile: creatorProfile?.displayName ?? principal.name ?? "Creator",
        shortPostId: post.id
      }
    });
  }

  await prisma.studioProject.update({
    where: { id: project.id },
    data: { status: "PUBLISHED" }
  });

  await Promise.all(
    project.assets.map((asset) => {
      const meta =
        (asset.metaJson as Record<string, unknown> | null) ??
        {};
      return Promise.all([
        prisma.studioAsset.update({
          where: { id: asset.id },
          data: {
            temporary: false,
            metaJson: {
              ...meta,
              lifecycleState: "published",
              projectId: project.id,
              publishedAt: new Date().toISOString(),
              publishedById: principal.userId,
              publishedPostId: post.id,
              temporary: false
            } as Prisma.InputJsonValue
          }
        }),
        prisma.assetLineage.upsert({
          where: { studioAssetId: asset.id },
          update: {
            originType: "GENERATED",
            rightsStatus: "UNVERIFIED",
            provenanceJson: {
              projectType: project.type,
              projectId: project.id,
              publishedPostId: post.id,
              generatedAt: new Date().toISOString()
            } as Prisma.InputJsonValue
          },
          create: {
            projectId: project.id,
            studioAssetId: asset.id,
            rootAssetId: asset.id,
            originType: "GENERATED",
            rightsStatus: "UNVERIFIED",
            provenanceJson: {
              projectType: project.type,
              projectId: project.id,
              publishedPostId: post.id,
              generatedAt: new Date().toISOString()
            } as Prisma.InputJsonValue
          }
        })
      ]);
    })
  );

  return NextResponse.json({ post });
}
