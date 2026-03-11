export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { appendEmotionalSafetySignal, readEmotionalSafetySignals } from "@/lib/emotionalSafetySignals";

const payloadSchema = z.object({
  signalId: z.string().min(1),
  userId: z.string().min(1),
  pattern: z.string().min(1),
  severity: z.number().min(0).max(1),
  source: z.string().min(1)
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const signals = await readEmotionalSafetySignals();
  return NextResponse.json({ ok: true, signals });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await appendEmotionalSafetySignal(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });

  return NextResponse.json({ ok: true, result });
}
