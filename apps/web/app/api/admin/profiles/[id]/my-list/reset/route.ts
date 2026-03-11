export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const resetSchema = z.discriminatedUnion("scope", [
  z.object({ scope: z.literal("all") }),
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

  const result = await prisma.myListItem.deleteMany({
    where:
      parsed.data.scope === "all"
        ? { profileId: id }
        : { profileId: id, showId: parsed.data.showId }
  });

  await writeAudit(
    auth.session.user.id,
    "profiles:my-list-reset",
    `Reset my list for profile ${id}: ${parsed.data.scope} (${result.count})`
  );
  return NextResponse.json({ ok: true, deletedCount: result.count });
}
