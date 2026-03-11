export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { promoteReleaseCandidate } from "@/lib/media-corp/service";

const bodySchema = z.object({
  releaseCandidateId: z.string().min(1),
  status: z.enum(["draft", "ready", "scheduled", "published"]).optional()
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = bodySchema.parse(await request.json());
  const data = await promoteReleaseCandidate(payload);
  return NextResponse.json(data);
}
