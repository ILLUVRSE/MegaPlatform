export const dynamic = "force-dynamic";

/**
 * Season detail API.
 * GET: returns season
 * PUT: update season
 * DELETE: remove season
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const season = await prisma.season.findUnique({
    where: { id }
  });

  if (!season) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(season);
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
  const parsed = seasonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const season = await prisma.season.update({
    where: { id },
    data: parsed.data
  });

  await writeAudit(auth.session.user.id, "seasons:update", `Updated season ${season.title}`);

  return NextResponse.json({ id: season.id });
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
  const season = await prisma.season.delete({
    where: { id }
  });

  await writeAudit(auth.session.user.id, "seasons:delete", `Deleted season ${season.title}`);

  return NextResponse.json({ ok: true });
}
