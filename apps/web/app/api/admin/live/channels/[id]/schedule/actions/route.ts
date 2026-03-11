export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { generateScheduleForChannel } from "@/lib/adminLiveScheduler";

const actionSchema = z.object({
  action: z.enum(["generate24h", "generate7d", "clear", "lock", "unlock"])
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok || !auth.session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const channel = await prisma.liveChannel.findUnique({ where: { id } });
  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  switch (parsed.data.action) {
    case "clear": {
      const deleted = await prisma.liveProgram.deleteMany({ where: { channelId: id } });
      await writeAudit(auth.session.user.id, "live-schedule:clear", `Cleared ${deleted.count} programs for ${channel.name}`);
      return NextResponse.json({ ok: true, deleted: deleted.count });
    }
    case "lock": {
      await prisma.liveChannel.update({ where: { id }, data: { scheduleLocked: true } });
      await writeAudit(auth.session.user.id, "live-schedule:lock", `Locked schedule for ${channel.name}`);
      return NextResponse.json({ ok: true });
    }
    case "unlock": {
      await prisma.liveChannel.update({ where: { id }, data: { scheduleLocked: false } });
      await writeAudit(auth.session.user.id, "live-schedule:unlock", `Unlocked schedule for ${channel.name}`);
      return NextResponse.json({ ok: true });
    }
    case "generate24h":
    case "generate7d": {
      const result = await generateScheduleForChannel(id, parsed.data.action === "generate7d" ? "7d" : "24h");
      await writeAudit(auth.session.user.id, "live-schedule:generate", `Generated schedule for ${channel.name}`);
      return NextResponse.json({ ok: true, result });
    }
  }
}
