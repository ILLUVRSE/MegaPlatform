export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const programSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  episodeId: z.string().optional().nullable(),
  streamUrl: z.string().url().optional().nullable().or(z.literal("")),
  order: z.number().int().optional().nullable()
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const programs = await prisma.liveProgram.findMany({
    where: { channelId: id },
    orderBy: { startsAt: "asc" },
    include: { episode: true }
  });
  return NextResponse.json({ data: programs });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok || !auth.session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const parsed = programSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const program = await prisma.liveProgram.create({
    data: {
      channelId: id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
      episodeId: parsed.data.episodeId ?? null,
      streamUrl: parsed.data.streamUrl ? parsed.data.streamUrl : null,
      order: parsed.data.order ?? null
    }
  });

  await writeAudit(auth.session.user.id, "live-program:create", `Created program ${program.title}`);
  return NextResponse.json({ id: program.id });
}
