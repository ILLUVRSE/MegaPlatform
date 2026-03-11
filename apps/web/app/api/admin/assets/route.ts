import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";

export const dynamic = "force-dynamic";

type ReferenceMap = {
  show: Array<{ id: string; title: string; field: "posterUrl" | "heroUrl" }>;
  episode: Array<{ id: string; title: string; field: "assetUrl" }>;
};

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.status === 403 ? "Forbidden" : "Unauthorized" }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind")?.trim() ?? "";
  const q = searchParams.get("q")?.trim() ?? "";
  const flagged = searchParams.get("flagged") === "1";
  const quarantined = searchParams.get("quarantined") === "1";
  const temporary = searchParams.get("temporary") === "1";

  const where: Record<string, unknown> = {};
  if (kind) where.kind = kind;
  if (flagged) where.isFlagged = true;
  if (quarantined) where.isQuarantined = true;
  if (temporary) where.temporary = true;
  if (q) {
    where.OR = [
      { url: { contains: q, mode: "insensitive" } },
      { storageKey: { contains: q, mode: "insensitive" } }
    ];
  }

  const assets = await prisma.studioAsset.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      project: {
        select: { id: true, title: true, type: true, status: true }
      }
    }
  });

  const urls = assets.map((asset) => asset.url);
  const [shows, episodes] = await Promise.all([
    prisma.show.findMany({
      where: {
        OR: [{ posterUrl: { in: urls } }, { heroUrl: { in: urls } }]
      },
      select: { id: true, title: true, posterUrl: true, heroUrl: true }
    }),
    prisma.episode.findMany({
      where: { assetUrl: { in: urls } },
      select: { id: true, title: true, assetUrl: true }
    })
  ]);

  const refs = new Map<string, ReferenceMap>();
  for (const show of shows) {
    if (show.posterUrl) {
      const existing = refs.get(show.posterUrl) ?? { show: [], episode: [] };
      existing.show.push({ id: show.id, title: show.title, field: "posterUrl" });
      refs.set(show.posterUrl, existing);
    }
    if (show.heroUrl) {
      const existing = refs.get(show.heroUrl) ?? { show: [], episode: [] };
      existing.show.push({ id: show.id, title: show.title, field: "heroUrl" });
      refs.set(show.heroUrl, existing);
    }
  }
  for (const episode of episodes) {
    const existing = refs.get(episode.assetUrl) ?? { show: [], episode: [] };
    existing.episode.push({ id: episode.id, title: episode.title, field: "assetUrl" });
    refs.set(episode.assetUrl, existing);
  }

  return NextResponse.json({
    data: assets.map((asset) => ({
      ...asset,
      references: refs.get(asset.url) ?? { show: [], episode: [] }
    }))
  });
}
