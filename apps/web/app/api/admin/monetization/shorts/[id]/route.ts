export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const schema = z.object({
  isPremium: z.boolean(),
  price: z.number().int().min(0).optional().nullable()
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  if (parsed.data.isPremium && parsed.data.price == null) {
    return NextResponse.json({ error: "Price required for premium shorts" }, { status: 400 });
  }

  const post = await prisma.shortPost.update({
    where: { id },
    data: {
      isPremium: parsed.data.isPremium,
      price: parsed.data.isPremium ? parsed.data.price ?? 0 : null
    }
  });

  await writeAudit(auth.session.user.id, "monetization:short-update", `Updated short ${post.id}`);
  return NextResponse.json({ post });
}
