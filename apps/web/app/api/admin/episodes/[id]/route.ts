/**
 * Episode detail API.
 * GET: returns episode
 * PUT: update episode
 * DELETE: remove episode
 * Guard: requireAdmin (RBAC)
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { enforceAdminPolicy, policyViolationResponse } from "@/lib/policyEnforcement";

export const dynamic = "force-dynamic";

const episodeSchema = z.object({
  seasonId: z.string().min(1),
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  lengthSeconds: z.number().int().min(30),
  assetUrl: z.string().url()
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const episode = await prisma.episode.findUnique({
    where: { id }
  });

  if (!episode) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(episode);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok || !auth.session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = episodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const episode = await prisma.episode.update({
    where: { id },
    data: {
      seasonId: parsed.data.seasonId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      lengthSeconds: parsed.data.lengthSeconds,
      assetUrl: parsed.data.assetUrl
    }
  });

  await writeAudit(auth.session.user.id, "episodes:update", `Updated episode ${episode.title}`);

  return NextResponse.json({ id: episode.id });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok || !auth.session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existingEpisode = await prisma.episode.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      _count: {
        select: {
          livePrograms: true
        }
      }
    }
  });
  if (!existingEpisode) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const decision = await enforceAdminPolicy({
    adminId: auth.session.user.id,
    scope: "infrastructure",
    action: "db.destructive",
    target: {
      kind: "infra",
      resource: "episode",
      operation: "delete",
      id
    },
    attributes: {
      scheduledProgramCount: existingEpisode._count.livePrograms
    }
  });

  if (!decision.ok) {
    return NextResponse.json({ error: decision.reason }, { status: 400 });
  }

  if (!decision.allow) {
    return policyViolationResponse(decision);
  }

  const episode = await prisma.episode.delete({
    where: { id }
  });

  await writeAudit(auth.session.user.id, "episodes:delete", `Deleted episode ${episode.title}`);

  return NextResponse.json({ ok: true });
}
