export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { authOptions } from "@/lib/auth";
import { attachAnonCookie, ensureAnonId } from "@/lib/anon";

const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(500)
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");

  const comments = await prisma.feedComment.findMany({
    where: { postId: id },
    take: 20,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({
    items: comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      userId: comment.userId,
      anonId: comment.anonId,
      createdAt: comment.createdAt.toISOString()
    })),
    nextCursor: comments.length === 20 ? comments[comments.length - 1]?.id ?? null : null
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  const { anonId, shouldSetCookie } = ensureAnonId(request);

  const parsed = createCommentSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const comment = await prisma.feedComment.create({
    data: {
      postId: id,
      userId,
      anonId: userId ? null : anonId,
      body: parsed.data.body
    }
  });

  await prisma.feedPost.update({
    where: { id },
    data: { commentCount: { increment: 1 } }
  });

  const response = NextResponse.json({
    item: {
      id: comment.id,
      body: comment.body,
      userId: comment.userId,
      anonId: comment.anonId,
      createdAt: comment.createdAt.toISOString()
    }
  });

  return attachAnonCookie(response, anonId, shouldSetCookie);
}
