export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { createGameSchema, buildFallbackSpec, buildThumbnail, getOwnerContext, validateAndAutofix } from "@/lib/gamegrid/api";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createGameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  let { ownerId, ownerKey } = await getOwnerContext(request);
  if (ownerId) {
    const exists = await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true } });
    if (!exists) {
      ownerId = null;
    }
  }
  if (!ownerId && !ownerKey) {
    try {
      ownerKey = crypto.randomUUID();
    } catch {
      ownerKey = `gg_${Math.random().toString(36).slice(2, 12)}`;
    }
  }

  const { title, description, seed, templateId, specDraft, paletteId, thumbnailUrl: thumbnailOverride } =
    parsed.data;
  let spec = specDraft ?? buildFallbackSpec({ title, seed, templateId, paletteId });
  spec = { ...spec, title };

  try {
    const fixed = validateAndAutofix(spec);
    const thumbnailUrl = thumbnailOverride ?? buildThumbnail(fixed.spec);
    const game = await prisma.$transaction(async (tx) => {
      const created = await tx.userGame.create({
        data: {
          ownerId,
          ownerKey,
          title,
          description: description ?? null,
          status: "DRAFT",
          version: 1,
          seed: fixed.spec.seed,
          templateId: fixed.spec.templateId,
          specJson: fixed.spec,
          thumbnailUrl
        }
      });
      await tx.userGameVersion.create({
        data: {
          userGameId: created.id,
          version: 1,
          specJson: fixed.spec
        }
      });
      return created;
    });

    return NextResponse.json({ game, warnings: fixed.warnings, changes: fixed.changes, ownerKey });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
