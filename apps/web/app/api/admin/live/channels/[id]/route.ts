export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  category: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  logoUrl: z.string().url().optional().nullable().or(z.literal("")),
  heroUrl: z.string().url().optional().nullable().or(z.literal("")),
  streamUrl: z.string().url().optional().nullable().or(z.literal("")),
  isActive: z.boolean(),
  isVirtual: z.boolean(),
  scheduleLocked: z.boolean().optional().default(false),
  defaultProgramDurationMin: z.number().int().min(1).max(240).optional().nullable()
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.status === 403 ? "Forbidden" : "Unauthorized" }, { status: auth.status });
  const { id } = await params;

  const channel = await prisma.liveChannel.findUnique({
    where: { id },
    include: {
      _count: { select: { programs: true } }
    }
  });
  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(channel);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok || !auth.session?.user?.id) {
    return NextResponse.json({ error: auth.status === 403 ? "Forbidden" : "Unauthorized" }, { status: auth.status });
  }
  const { id } = await params;

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const channel = await prisma.liveChannel.update({
    where: { id },
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      category: parsed.data.category ?? null,
      description: parsed.data.description ?? null,
      logoUrl: parsed.data.logoUrl ? parsed.data.logoUrl : null,
      heroUrl: parsed.data.heroUrl ? parsed.data.heroUrl : null,
      streamUrl: parsed.data.streamUrl ? parsed.data.streamUrl : null,
      isActive: parsed.data.isActive,
      isVirtual: parsed.data.isVirtual,
      scheduleLocked: parsed.data.scheduleLocked,
      defaultProgramDurationMin: parsed.data.defaultProgramDurationMin ?? null
    }
  });

  await writeAudit(auth.session.user.id, "live-channel:update", `Updated ${channel.name}`);
  return NextResponse.json({ id: channel.id });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok || !auth.session?.user?.id) {
    return NextResponse.json({ error: auth.status === 403 ? "Forbidden" : "Unauthorized" }, { status: auth.status });
  }
  const { id } = await params;

  await prisma.liveProgram.deleteMany({ where: { channelId: id } });
  const channel = await prisma.liveChannel.delete({ where: { id } });
  await writeAudit(auth.session.user.id, "live-channel:delete", `Deleted ${channel.name}`);
  return NextResponse.json({ ok: true });
}
