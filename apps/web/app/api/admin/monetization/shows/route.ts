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

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  const shows = await prisma.show.findMany({
    where: query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { slug: { contains: query, mode: "insensitive" } }
          ]
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, slug: true, isPremium: true, price: true },
    take: 200
  });

  return NextResponse.json({ data: shows });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok || !auth.session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing show id" }, { status: 400 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  if (parsed.data.isPremium && parsed.data.price == null) {
    return NextResponse.json({ error: "Price required for premium shows" }, { status: 400 });
  }

  const show = await prisma.show.update({
    where: { id },
    data: {
      isPremium: parsed.data.isPremium,
      price: parsed.data.isPremium ? parsed.data.price ?? 0 : null
    }
  });

  await writeAudit(auth.session.user.id, "monetization:show-update", `Updated show ${show.id}`);
  return NextResponse.json({ show });
}
