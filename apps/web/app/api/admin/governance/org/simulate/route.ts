export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { runOrgRoleSimulation } from "@/lib/orgRoleSimulator";

const payloadSchema = z.object({
  scenario: z.string().min(1),
  urgency: z.enum(["low", "medium", "high"]).optional(),
  modules: z.array(z.string().min(1)).optional()
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await runOrgRoleSimulation(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });

  return NextResponse.json({ ok: true, simulation: result });
}
