export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { evaluateSpatialAudioRuntimeV1 } from "@/lib/spatialAudioRuntimeV1";

const payloadSchema = z.object({
  deviceTier: z.enum(["low", "medium", "high"]),
  activeSpatialVoices: z.number().int().nonnegative(),
  hrtfSourceCount: z.number().int().nonnegative(),
  directionalAudioEnabled: z.boolean(),
  distanceAttenuationEnabled: z.boolean()
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  const result = await evaluateSpatialAudioRuntimeV1(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });
  return NextResponse.json({ ok: true, result });
}
