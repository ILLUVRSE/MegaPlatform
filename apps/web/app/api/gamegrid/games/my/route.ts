export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { getOwnerContext } from "@/lib/gamegrid/api";

export async function GET(request: Request) {
  const { ownerId, ownerKey } = await getOwnerContext(request);
  if (!ownerId && !ownerKey) {
    return NextResponse.json({ games: [] });
  }

  const games = await prisma.userGame.findMany({
    where: ownerId ? { ownerId } : { ownerKey },
    orderBy: { updatedAt: "desc" }
  });

  return NextResponse.json({ games });
}
