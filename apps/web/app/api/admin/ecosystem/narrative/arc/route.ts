export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { buildMultiModalNarrativeArc } from "@/lib/multiModalNarrative";

const payloadSchema = z.object({
  narrativeId: z.string().min(1),
  theme: z.string().min(1),
  assets: z.array(
    z.object({
      id: z.string().min(1),
      format: z.enum(["text", "video", "audio", "game"]),
      title: z.string().min(1)
    })
  )
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const arc = await buildMultiModalNarrativeArc(parsed.data);
  if (!arc.ok) return NextResponse.json({ ok: false, error: arc.reason }, { status: 400 });

  return NextResponse.json({ ok: true, arc });
}
