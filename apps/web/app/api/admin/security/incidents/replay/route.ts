export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { runSyntheticIncidentReplay } from "@/lib/syntheticIncidentReplayGrid";

const payloadSchema = z.object({
  replays: z.array(
    z.object({
      id: z.string().min(1),
      severity: z.enum(["low", "medium", "high", "critical"]),
      response: z.record(z.string(), z.string())
    })
  )
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await runSyntheticIncidentReplay(parsed.data.replays);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });

  return NextResponse.json({ ok: true, result });
}
