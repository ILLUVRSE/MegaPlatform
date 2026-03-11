export const dynamic = "force-dynamic";

/**
 * Studio projects API.
 * POST: { type, title, description? } -> { project }
 * GET: ?type=SHORT|MEME -> { projects }
 * Guard: none; createdById optional if session exists.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureCreatorProfile } from "@/lib/creatorIdentity";

const projectSchema = z.object({
  type: z.enum(["SHORT", "MEME", "REMIX", "SHOW", "GAME", "PARTY_GAME"]),
  title: z.string().min(2).max(120),
  description: z.string().optional().nullable()
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const candidateId = session?.user?.id ?? null;
  const createdById = candidateId
    ? (await prisma.user.findUnique({ where: { id: candidateId }, select: { id: true } }))?.id ?? null
    : null;
  const creatorProfile =
    createdById && session?.user
      ? await ensureCreatorProfile({
          id: createdById,
          name: session.user.name ?? null,
          email: session.user.email ?? null
        }).catch(() => null)
      : null;

  const project = await prisma.studioProject.create({
    data: {
      type: parsed.data.type,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: "DRAFT",
      createdById,
      creatorProfileId: creatorProfile?.id ?? null
    }
  });

  return NextResponse.json({ project });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  const where = type
    ? {
        type: type as "SHORT" | "MEME" | "REMIX" | "SHOW" | "GAME" | "PARTY_GAME"
      }
    : undefined;

  const projects = await prisma.studioProject.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return NextResponse.json({ projects });
}
