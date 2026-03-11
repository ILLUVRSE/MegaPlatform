export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { runScheduler } from "@/lib/adminLiveScheduler";
import { writeAudit } from "@/lib/audit";

const runSchema = z.object({
  window: z.enum(["24h", "7d"]).default("24h")
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok || !auth.session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = runSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const result = await runScheduler(parsed.data.window, auth.session.user.id);
  await writeAudit(auth.session.user.id, "live-scheduler:run", result.summary);
  return NextResponse.json({ ok: true, result });
}
