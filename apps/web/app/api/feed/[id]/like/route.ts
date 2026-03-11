export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@illuvrse/db";
import { authOptions } from "@/lib/auth";
import { attachAnonCookie, ensureAnonId } from "@/lib/anon";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  const { anonId, shouldSetCookie } = ensureAnonId(request);

  const existing = await prisma.feedReaction.findFirst({
    where: {
      postId: id,
      type: "LIKE",
      ...(userId ? { userId } : { anonId })
    }
  });

  let liked: boolean;
  if (existing) {
    await prisma.feedReaction.delete({ where: { id: existing.id } });
    await prisma.feedPost.update({ where: { id }, data: { likeCount: { decrement: 1 } } });
    liked = false;
  } else {
    await prisma.feedReaction.create({
      data: {
        postId: id,
        type: "LIKE",
        userId,
        anonId: userId ? null : anonId
      }
    });
    await prisma.feedPost.update({ where: { id }, data: { likeCount: { increment: 1 } } });
    liked = true;
  }

  const post = await prisma.feedPost.findUnique({ where: { id }, select: { likeCount: true } });
  const response = NextResponse.json({ liked, likeCount: post?.likeCount ?? 0 });
  return attachAnonCookie(response, anonId, shouldSetCookie);
}
