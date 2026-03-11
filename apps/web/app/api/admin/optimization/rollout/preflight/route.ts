export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { validateRolloutPreflight } from "@/lib/simulationSandbox";

const payloadSchema = z.object({
  simulation: z
    .object({
      pass: z.boolean()
    })
    .nullable()
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = payloadSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  const result = await validateRolloutPreflight(parsed.data.simulation);
  if (!result.pass) {
    return NextResponse.json({ ok: false, ...result }, { status: 409 });
  }
  return NextResponse.json({ ok: true, ...result });
}
