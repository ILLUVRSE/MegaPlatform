export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { runSimulation } from "@/lib/simulationSandbox";

const payloadSchema = z.object({
  changeType: z.string().min(1),
  expectedLift: z.number(),
  expectedRisk: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1)
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = payloadSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  const report = await runSimulation(parsed.data);
  return NextResponse.json({ ok: true, report });
}
