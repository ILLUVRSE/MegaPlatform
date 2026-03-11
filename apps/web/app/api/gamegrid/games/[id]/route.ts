export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { getOwnerContext, updateGameSchema, validateAndAutofix, buildThumbnail, minigameSpecSchema } from "@/lib/gamegrid/api";

const isOwnerMatch = (ownerId: string | null, ownerKey: string | null, game: { ownerId: string | null; ownerKey: string | null }) => {
  if (ownerId && game.ownerId && ownerId === game.ownerId) return true;
  if (!ownerId && ownerKey && game.ownerKey && ownerKey === game.ownerKey) return true;
  return false;
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await prisma.userGame.findUnique({ where: { id } });
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (game.status === "DRAFT") {
    const { ownerId, ownerKey } = await getOwnerContext(request);
    if (!isOwnerMatch(ownerId, ownerKey, game)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json({ game });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateGameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const game = await prisma.userGame.findUnique({ where: { id } });
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { ownerId, ownerKey } = await getOwnerContext(request);
  if (!isOwnerMatch(ownerId, ownerKey, game)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { title, description, specJson, thumbnailUrl } = parsed.data;
  const existingSpecParsed = minigameSpecSchema.safeParse(game.specJson);
  let nextSpecRaw = specJson;
  if (!nextSpecRaw) {
    if (!existingSpecParsed.success) {
      return NextResponse.json({ error: "Invalid draft spec" }, { status: 400 });
    }
    nextSpecRaw = existingSpecParsed.data;
  }
  const nextSpec = title ? { ...nextSpecRaw, title } : nextSpecRaw;

  try {
    const fixed = validateAndAutofix(nextSpec);
    const nextThumbnail = thumbnailUrl ?? buildThumbnail(fixed.spec);
    const updated = await prisma.$transaction(async (tx) => {
      const nextVersion = game.version + 1;
      const updatedGame = await tx.userGame.update({
        where: { id },
        data: {
          title: title ?? game.title,
          description: description ?? game.description,
          seed: fixed.spec.seed,
          templateId: fixed.spec.templateId,
          specJson: fixed.spec,
          thumbnailUrl: nextThumbnail,
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
