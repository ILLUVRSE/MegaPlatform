export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { appendAttributionEdge, queryAttributionEdges } from "@/lib/attributionGraphV2";

const payloadSchema = z.object({
  edgeId: z.string().min(1),
  subjectId: z.string().min(1),
  objectId: z.string().min(1),
  edgeType: z.string().min(1),
  actorKind: z.enum(["human", "agent"]),
  evidenceRef: z.string().min(1).optional()
});

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subjectId = new URL(req.url).searchParams.get("subjectId");
  if (!subjectId) return NextResponse.json({ error: "missing subjectId" }, { status: 400 });

  const edges = await queryAttributionEdges(subjectId);
  return NextResponse.json({ ok: true, edges });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await appendAttributionEdge(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 409 });

  return NextResponse.json({ ok: true, result });
}
