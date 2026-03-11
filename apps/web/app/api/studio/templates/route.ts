export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { AuthzError, requireSession } from "@/lib/authz";
import { ensureCreatorProfile } from "@/lib/creatorIdentity";

const createTemplateSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(400).optional().nullable(),
  kind: z.enum(["SHORT", "MEME", "GAME"]),
  tags: z.array(z.string().min(1).max(32)).max(10).optional(),
  schemaJson: z.record(z.string(), z.unknown()).default({})
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");

  const templates = await prisma.studioTemplate.findMany({
    where: {
      ...(kind ? { kind: kind as "SHORT" | "MEME" | "GAME" } : {}),
      isPublished: true
    },
    include: {
      creatorProfile: { select: { id: true, handle: true, displayName: true, reputationScore: true } },
      versions: { orderBy: { version: "desc" }, take: 1 }
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 60
  });

  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  let principal;
  try {
    principal = await requireSession(request);
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createTemplateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const creatorProfile = await ensureCreatorProfile({
    id: principal.userId,
    name: principal.name,
    email: principal.email
  });

  const template = await prisma.studioTemplate.create({
    data: {
      creatorProfileId: creatorProfile.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      kind: parsed.data.kind,
      isPublished: true,
      latestVersion: 1,
      tags: parsed.data.tags ?? [],
      versions: {
        create: {
          version: 1,
          title: parsed.data.title,
          description: parsed.data.description ?? null,
          schemaJson: parsed.data.schemaJson as Prisma.InputJsonValue
        }
      }
    },
    include: {
      versions: { orderBy: { version: "desc" }, take: 1 }
    }
  });

  return NextResponse.json({ template });
}
