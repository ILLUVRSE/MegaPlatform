export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { evaluateConsentSessionRecordingControls } from "@/lib/consentSessionRecordingControls";

const payloadSchema = z.object({
  explicitConsentGranted: z.boolean(),
  consentAgeMinutes: z.number().nonnegative(),
  sessionScopedConsent: z.boolean(),
  consentRevoked: z.boolean(),
  youthSession: z.boolean(),
  guardianConsentGranted: z.boolean()
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  const result = await evaluateConsentSessionRecordingControls(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });
  return NextResponse.json({ ok: true, result });
}
