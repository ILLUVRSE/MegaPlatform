export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { createSpatialTelemetryEvent } from "@/lib/spatialTelemetryTaxonomyV1";

const payloadSchema = z.object({
  module: z.string().min(1),
  eventType: z.string().min(1),
  action: z.string().min(1),
  payload: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  const result = await createSpatialTelemetryEvent(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });
  return NextResponse.json({ ok: true, result });
}
