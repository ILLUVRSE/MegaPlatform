export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";

const schema = z.object({ featuredRank: z.number().int().optional(), pinned: z.boolean().optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await prisma.feedPost.update({
    where: { id },
    data: {
      isPinned: parsed.data.pinned ?? true,
      ...(typeof parsed.data.featuredRank === "number" ? { featuredRank: parsed.data.featuredRank } : {})
    }
  });

  return NextResponse.json({ ok: true });
}
