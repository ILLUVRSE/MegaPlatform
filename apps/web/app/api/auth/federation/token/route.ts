export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { issueFederatedAccess } from "@/lib/federationGateway";

const payloadSchema = z.object({
  issuer: z.string().min(1),
  subject: z.string().min(1),
  scopes: z.array(z.string().min(1)).min(1)
});

export async function POST(req: Request) {
  const parsed = payloadSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  const result = await issueFederatedAccess(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 403 });
  return NextResponse.json({ ok: true, token: result.token });
}
