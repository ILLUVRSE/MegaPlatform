export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { getMediaCorpDashboardData, updateDistributionChannel } from "@/lib/media-corp/service";

const bodySchema = z.object({
  channelId: z.string().min(1),
  status: z.enum(["active", "paused", "sandbox_only"]).optional(),
  description: z.string().optional()
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const data = await getMediaCorpDashboardData();
  return NextResponse.json({ channels: data.worldState.distributionChannels });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const payload = bodySchema.parse(await request.json());
  const data = await updateDistributionChannel(payload);
  return NextResponse.json(data);
}
