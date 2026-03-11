export const dynamic = "force-dynamic";

/**
 * Watch profiles API.
 * GET: -> { profiles }
 * POST: { name, avatarUrl?, isKids? } -> { profile }
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const profileSchema = z.object({
  name: z.string().min(1).max(40),
  avatarUrl: z.string().url().optional().nullable(),
  isKids: z.boolean().optional().default(false)
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id && !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        ...(session.user.id ? [{ id: session.user.id }] : []),
        ...(session.user.email ? [{ email: session.user.email }] : [])
      ]
    },
    select: { id: true }
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profiles = await prisma.profile.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json({ profiles });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id && !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        ...(session.user.id ? [{ id: session.user.id }] : []),
        ...(session.user.email ? [{ email: session.user.email }] : [])
      ]
    },
    select: { id: true }
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const profile = await prisma.profile.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      avatarUrl: parsed.data.avatarUrl ?? null,
      isKids: parsed.data.isKids ?? false
    }
  });

  return NextResponse.json({ profile });
}
