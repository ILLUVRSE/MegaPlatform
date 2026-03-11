export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { authOptions } from "@/lib/auth";
import { attachAnonCookie, ensureAnonId } from "@/lib/anon";

const shareSchema = z.object({
  caption: z.string().trim().max(500).optional(),
  authorProfile: z.string().trim().max(80).optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  const { anonId, shouldSetCookie } = ensureAnonId(request);

  const parsed = shareSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const share = await prisma.feedPost.create({
    data: {
      type: "SHARE",
      shareOfId: id,
      caption: parsed.data.caption || null,
      authorId: userId,
      authorProfile: userId ? session?.user?.name ?? "User" : parsed.data.authorProfile || "Anonymous"
    }
  });

  await prisma.feedPost.update({
    where: { id },
    data: { shareCount: { increment: 1 } }
  });

  const response = NextResponse.json({ id: share.id }, { status: 201 });
  return attachAnonCookie(response, anonId, shouldSetCookie);
}
