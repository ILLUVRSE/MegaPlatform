export const dynamic = "force-dynamic";

/**
 * Seasons collection API.
 * GET: ?all=1 -> { data }
 * POST: { showId, number, title } -> { id }
 * Guard: requireAdmin (RBAC)
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const seasonSchema = z.object({
  showId: z.string().min(1),
  number: z.number().int().min(1),
  title: z.string().min(2)
});

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "1";

  const seasons = await prisma.season.findMany({
    orderBy: { createdAt: "desc" },
    include: { show: true }
  });

  const data = seasons.map((season) => ({
    id: season.id,
    title: season.title,
    number: season.number,
    showTitle: season.show.title
  }));

  if (all) {
    return NextResponse.json({ data });
  }

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok || !auth.session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = seasonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const season = await prisma.season.create({
    data: parsed.data
  });

  await writeAudit(auth.session.user.id, "seasons:create", `Created season ${season.title}`);

  return NextResponse.json({ id: season.id });
}
