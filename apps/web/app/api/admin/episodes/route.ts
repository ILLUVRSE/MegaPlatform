export const dynamic = "force-dynamic";

/**
 * Episodes collection API.
 * GET: returns list
 * POST: { seasonId, title, description?, lengthSeconds, assetUrl } -> { id }
 * Guard: requireAdmin (RBAC)
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const episodeSchema = z.object({
  seasonId: z.string().min(1),
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  lengthSeconds: z.number().int().min(30),
  assetUrl: z.string().url()
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const episodes = await prisma.episode.findMany({
    orderBy: { createdAt: "desc" },
    include: { season: { include: { show: true } } }
  });

  const data = episodes.map((episode) => ({
    id: episode.id,
    title: episode.title,
    showTitle: episode.season.show.title,
    seasonTitle: episode.season.title,
    lengthSeconds: episode.lengthSeconds
  }));

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok || !auth.session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = episodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const episode = await prisma.episode.create({
    data: {
      seasonId: parsed.data.seasonId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      lengthSeconds: parsed.data.lengthSeconds,
      assetUrl: parsed.data.assetUrl
    }
  });

  await writeAudit(auth.session.user.id, "episodes:create", `Created episode ${episode.title}`);

  return NextResponse.json({ id: episode.id });
}
