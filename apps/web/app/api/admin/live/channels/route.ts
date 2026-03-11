export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const channelSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  category: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  logoUrl: z.string().url().optional().nullable().or(z.literal("")),
  heroUrl: z.string().url().optional().nullable().or(z.literal("")),
  streamUrl: z.string().url().optional().nullable().or(z.literal("")),
  isActive: z.boolean().optional().default(true),
  isVirtual: z.boolean().optional().default(false),
  defaultProgramDurationMin: z.number().int().min(1).max(240).optional().nullable()
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const channels = await prisma.liveChannel.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { programs: true }
      }
    }
  });

  return NextResponse.json({ data: channels });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok || !auth.session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = channelSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const channel = await prisma.liveChannel.create({
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
      defaultProgramDurationMin: parsed.data.defaultProgramDurationMin ?? null
    }
  });

  await writeAudit(auth.session.user.id, "live-channel:create", `Created ${channel.name}`);
  return NextResponse.json({ id: channel.id });
}
