export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  isKids: z.boolean().optional()
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const profile = await prisma.profile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, name: true } },
      listItems: {
        orderBy: { createdAt: "desc" }
      },
      progress: {
        orderBy: { updatedAt: "desc" },
        include: {
          episode: {
            include: {
              season: {
                include: {
                  show: true
                }
              }
            }
          }
        }
      }
    }
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const showIds = profile.listItems.map((item) => item.showId).filter(Boolean) as string[];
  const shows = showIds.length
    ? await prisma.show.findMany({
        where: { id: { in: showIds } },
        select: { id: true, title: true, slug: true, posterUrl: true }
      })
    : [];
  const showById = new Map(shows.map((show) => [show.id, show]));

  return NextResponse.json({
    profile: {
      id: profile.id,
      name: profile.name,
      isKids: profile.isKids,
      avatarUrl: profile.avatarUrl,
      user: profile.user
    },
    myList: profile.listItems.map((item) => ({
      id: item.id,
      mediaType: item.mediaType,
      showId: item.showId,
      createdAt: item.createdAt,
      show: item.showId ? showById.get(item.showId) ?? null : null
    })),
    progress: profile.progress.map((item) => ({
      id: item.id,
      episodeId: item.episodeId,
      positionSec: item.positionSec,
      durationSec: item.durationSec,
      updatedAt: item.updatedAt,
      episode: {
        id: item.episode.id,
        title: item.episode.title,
        seasonNumber: item.episode.season.number,
        showId: item.episode.season.show.id,
        showTitle: item.episode.season.show.title,
        showSlug: item.episode.season.show.slug
      }
    }))
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok || !auth.session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const profile = await prisma.profile.update({
    where: { id },
    data: {
      ...(parsed.data.name != null ? { name: parsed.data.name } : {}),
      ...(parsed.data.isKids != null ? { isKids: parsed.data.isKids } : {})
    }
  });

  await writeAudit(auth.session.user.id, "profiles:update", `Updated profile ${profile.id}`);
  return NextResponse.json({ profile });
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
  await prisma.profile.delete({ where: { id } });
  await writeAudit(auth.session.user.id, "profiles:delete", `Deleted profile ${id}`);
  return NextResponse.json({ ok: true });
}
