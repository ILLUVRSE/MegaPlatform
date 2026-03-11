export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { resolveAgentConflict } from "@/lib/conflictResolver";

const proposalSchema = z.object({
  agent: z.string().min(1),
  objective: z.string().min(1),
  action: z.string().min(1),
  effect: z.enum(["allow", "deny"]),
  rationale: z.string().min(1)
});

const payloadSchema = z.object({
  proposals: z.array(proposalSchema).min(2)
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await resolveAgentConflict(parsed.data.proposals);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });

  return NextResponse.json({ ok: true, arbitration: result });
}
