export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { validateCoCreationWorkflow } from "@/lib/communityCoCreation";

const payloadSchema = z.object({
  workflowId: z.string().min(1),
  moderationState: z.enum(["pending", "approved", "rejected"]),
  contributions: z.array(
    z.object({
      contributorType: z.enum(["user", "agent"]),
      contributorId: z.string().min(1),
      contentRef: z.string().min(1),
      provenanceRef: z.string().min(1).optional()
    })
  )
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await validateCoCreationWorkflow(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 409 });

  return NextResponse.json({ ok: true, workflow: result });
}
