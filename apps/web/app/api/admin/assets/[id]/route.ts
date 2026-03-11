export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const moderationSchema = z.object({
  isSafe: z.boolean().optional(),
  isFlagged: z.boolean().optional(),
  isQuarantined: z.boolean().optional(),
  temporary: z.boolean().optional()
});

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
  const parsed = moderationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const asset = await prisma.studioAsset.update({
    where: { id },
    data: {
      ...(parsed.data.isSafe != null ? { isSafe: parsed.data.isSafe } : {}),
      ...(parsed.data.isFlagged != null ? { isFlagged: parsed.data.isFlagged } : {}),
      ...(parsed.data.isQuarantined != null ? { isQuarantined: parsed.data.isQuarantined } : {}),
      ...(parsed.data.temporary != null ? { temporary: parsed.data.temporary } : {})
    }
  });

  await writeAudit(auth.session.user.id, "assets:moderate", `Updated asset ${asset.id}`);
  return NextResponse.json({ asset });
}
