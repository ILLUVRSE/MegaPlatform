export const dynamic = "force-dynamic";

/**
 * Show detail API.
 * GET: returns show
 * PUT: update show
 * DELETE: remove show
 * Guard: requireAdmin (RBAC)
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const showSchema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional().nullable(),
  posterUrl: z.string().url().optional().nullable().or(z.literal("")),
  heroUrl: z.string().url().optional().nullable().or(z.literal("")),
  featured: z.boolean().optional().default(false),
  trending: z.boolean().optional().default(false),
  newRelease: z.boolean().optional().default(false),
  heroPriority: z.number().int().optional().nullable(),
  featuredRail: z.string().optional().nullable(),
  featuredRailOrder: z.number().int().optional().nullable(),
  watchOrder: z.number().int().optional().nullable(),
  maturityRating: z.string().optional().nullable(),
  isPremium: z.boolean().optional().default(false),
  price: z.number().int().min(0).optional().nullable(),
  genres: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  cast: z.array(z.string()).optional().default([])
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const show = await prisma.show.findUnique({
    where: { id }
  });

  if (!show) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(show);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok || !auth.session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = showSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const show = await prisma.show.update({
    where: { id },
    data: {
      title: parsed.data.title,
      slug: parsed.data.slug,
      description: parsed.data.description ?? null,
      posterUrl: parsed.data.posterUrl ? parsed.data.posterUrl : null,
      heroUrl: parsed.data.heroUrl ? parsed.data.heroUrl : null,
      featured: parsed.data.featured,
      trending: parsed.data.trending,
      newRelease: parsed.data.newRelease,
      heroPriority: parsed.data.heroPriority ?? null,
      featuredRail: parsed.data.featuredRail ?? null,
      featuredRailOrder: parsed.data.featuredRailOrder ?? null,
      watchOrder: parsed.data.watchOrder ?? null,
      maturityRating: parsed.data.maturityRating ?? null,
      isPremium: parsed.data.isPremium,
      price: parsed.data.isPremium ? parsed.data.price ?? 0 : null,
      genres: parsed.data.genres,
      tags: parsed.data.tags,
      cast: parsed.data.cast
    }
  });

  await writeAudit(auth.session.user.id, "shows:update", `Updated show ${show.title}`);

  return NextResponse.json({ id: show.id });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok || !auth.session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const show = await prisma.show.delete({
    where: { id }
  });

  await writeAudit(auth.session.user.id, "shows:delete", `Deleted show ${show.title}`);

  return NextResponse.json({ ok: true });
}
