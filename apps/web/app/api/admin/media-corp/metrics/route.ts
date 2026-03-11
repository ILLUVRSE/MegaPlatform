export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { ingestMetrics } from "@/lib/media-corp/service";

const metricsSchema = z.object({
  impressions: z.number().nonnegative(),
  views: z.number().nonnegative(),
  opens: z.number().nonnegative(),
  clicks: z.number().nonnegative(),
  watchTime: z.number().nonnegative(),
  completionRate: z.number().nonnegative(),
  likes: z.number().nonnegative(),
  shares: z.number().nonnegative(),
  saves: z.number().nonnegative(),
  comments: z.number().nonnegative(),
  reposts: z.number().nonnegative(),
  ctr: z.number().nonnegative(),
  engagementRate: z.number().nonnegative(),
  conversionProxy: z.number().nonnegative(),
  decayRate: z.number().nonnegative(),
  audienceRetention: z.number().nonnegative(),
  timeToFirstEngagementMin: z.number().nonnegative()
});

const bodySchema = z.object({
  releaseCandidateId: z.string().min(1),
  channelId: z.string().min(1),
  metrics: metricsSchema
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const payload = bodySchema.parse(await request.json());
  const data = await ingestMetrics(payload);
  return NextResponse.json(data);
}
