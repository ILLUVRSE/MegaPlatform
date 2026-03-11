export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { appendStrategyMemory, listStrategyMemory } from "@/lib/strategyMemory";

const payloadSchema = z.object({
  theme: z.string().min(1),
  summary: z.string().min(1),
  evidence: z.array(
    z.object({
      kind: z.enum(["metric", "decision", "experiment"]),
      ref: z.string().min(1)
    })
  )
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await listStrategyMemory();
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await appendStrategyMemory(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 409 });

  return NextResponse.json(result);
}
