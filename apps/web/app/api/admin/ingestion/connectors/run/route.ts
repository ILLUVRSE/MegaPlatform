export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { runConnector } from "@/lib/connectors";

const payloadSchema = z.object({
  connectorId: z.string().min(1)
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = payloadSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await runConnector(parsed.data.connectorId);
  if (!result) return NextResponse.json({ error: "connector unavailable" }, { status: 404 });
  return NextResponse.json({ ok: true, result });
}
