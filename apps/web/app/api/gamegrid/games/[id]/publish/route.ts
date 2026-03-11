export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { getOwnerContext, validateAndAutofix, buildThumbnail, minigameSpecSchema } from "@/lib/gamegrid/api";

const isOwnerMatch = (ownerId: string | null, ownerKey: string | null, game: { ownerId: string | null; ownerKey: string | null }) => {
  if (ownerId && game.ownerId && ownerId === game.ownerId) return true;
  if (!ownerId && ownerKey && game.ownerKey && ownerKey === game.ownerKey) return true;
  return false;
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await prisma.userGame.findUnique({ where: { id } });
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { ownerId, ownerKey } = await getOwnerContext(request);
  if (!isOwnerMatch(ownerId, ownerKey, game)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsedSpec = minigameSpecSchema.safeParse(game.specJson);
  if (!parsedSpec.success) {
    return NextResponse.json({ error: "Invalid draft spec" }, { status: 400 });
  }
  try {
    const fixed = validateAndAutofix(parsedSpec.data);
    const thumbnailUrl = buildThumbnail(fixed.spec);
    const updated = await prisma.$transaction(async (tx) => {
      const nextVersion = game.version + 1;
      const updatedGame = await tx.userGame.update({
        where: { id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          specJson: fixed.spec,
          seed: fixed.spec.seed,
          templateId: fixed.spec.templateId,
          thumbnailUrl,
          version: nextVersion
        }
      });
      await tx.userGameVersion.create({
        data: {
          userGameId: id,
          version: nextVersion,
          specJson: fixed.spec
        }
      });
      return updatedGame;
    });

    return NextResponse.json({ game: updated, warnings: fixed.warnings, changes: fixed.changes });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
