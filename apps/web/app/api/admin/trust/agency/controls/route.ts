export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { readUserAgencyControls, upsertUserAgencyControls } from "@/lib/userAgencyControls";

const payloadSchema = z.object({
  userId: z.string().min(1),
  autonomyMode: z.string().min(1),
  topicOptOuts: z.array(z.string().min(1)),
  maxPersonalizationIntensity: z.number().min(0).max(1),
  allowCrossSurfaceContinuity: z.boolean()
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const controls = await readUserAgencyControls();
  return NextResponse.json({ ok: true, controls });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await upsertUserAgencyControls(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 409 });

  return NextResponse.json({ ok: true, result });
}
