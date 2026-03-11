export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const resetSchema = z.discriminatedUnion("scope", [
  z.object({ scope: z.literal("all") }),
  z.object({ scope: z.literal("episode"), episodeId: z.string().min(1) }),
  z.object({ scope: z.literal("show"), showId: z.string().min(1) })
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok || !auth.session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  let deletedCount = 0;
  if (parsed.data.scope === "all") {
    const result = await prisma.watchProgress.deleteMany({ where: { profileId: id } });
    deletedCount = result.count;
  } else if (parsed.data.scope === "episode") {
    const result = await prisma.watchProgress.deleteMany({
      where: { profileId: id, episodeId: parsed.data.episodeId }
    });
    deletedCount = result.count;
  } else {
    const result = await prisma.watchProgress.deleteMany({
      where: {
        profileId: id,
        episode: { season: { showId: parsed.data.showId } }
      }
    });
    deletedCount = result.count;
  }

  await writeAudit(
    auth.session.user.id,
    "profiles:progress-reset",
    `Reset progress for profile ${id}: ${parsed.data.scope} (${deletedCount})`
  );
  return NextResponse.json({ ok: true, deletedCount });
}
