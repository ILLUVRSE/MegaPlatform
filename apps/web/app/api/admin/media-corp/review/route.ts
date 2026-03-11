export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { reviewArtifactBundle } from "@/lib/media-corp/service";

const bodySchema = z.object({
  artifactBundleId: z.string().min(1),
  decision: z.enum(["approve", "reject", "revise"]),
  reviewer: z.string().min(1).optional(),
  notes: z.string().optional()
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = bodySchema.parse(await request.json());
  const data = await reviewArtifactBundle(payload);
  return NextResponse.json(data);
}
