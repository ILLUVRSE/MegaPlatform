export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";
import { planDistributionActions } from "@/lib/distributionOrchestrator";

const manualActionSchema = z.object({
  module: z.string().min(1).max(64),
  targetType: z.string().min(1).max(64),
  targetId: z.string().min(1).max(120),
  actionType: z.string().min(1).max(64),
  priority: z.number().int().min(0).max(100).optional(),
  scheduledFor: z.string().datetime().optional(),
  metadataJson: z.record(z.string(), z.unknown()).optional()
});

const autoSchema = z.object({
  mode: z.literal("auto")
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actions = await prisma.distributionAction.findMany({
    orderBy: [{ scheduledFor: "asc" }, { createdAt: "desc" }],
    take: 100
  });
  return NextResponse.json({ actions });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const autoParsed = autoSchema.safeParse(body);
  if (autoParsed.success) {
    const posts = await prisma.feedPost.findMany({
      where: { isHidden: false, isShadowbanned: false },
      orderBy: [{ likeCount: "desc" }, { createdAt: "desc" }],
      take: 12
    });
    const planned = planDistributionActions(
      posts.map((post, index) => ({
        id: post.id,
        type: post.type === "GAME" ? "GAME" : post.type === "WATCH_EPISODE" ? "WATCH_EPISODE" : "SHORT",
        score: Math.max(0.1, post.likeCount + post.commentCount * 0.5 + post.shareCount * 0.8 - index * 0.1)
      }))
    );

    const created = await Promise.all(
      planned.map((plan) =>
        prisma.distributionAction.create({
          data: {
            module: plan.module,
            targetType: plan.targetType,
            targetId: plan.targetId,
            actionType: plan.actionType,
            priority: plan.priority,
            scheduledFor: plan.scheduledFor,
            createdById: auth.session.user.id,
            metadataJson: plan.metadataJson as Prisma.InputJsonValue
          }
        })
      )
    );

    return NextResponse.json({ mode: "auto", created });
  }

  const parsed = manualActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const action = await prisma.distributionAction.create({
    data: {
      module: parsed.data.module,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      actionType: parsed.data.actionType,
      priority: parsed.data.priority ?? 0,
      scheduledFor: parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor) : new Date(),
      createdById: auth.session.user.id,
      ...(parsed.data.metadataJson ? { metadataJson: parsed.data.metadataJson as Prisma.InputJsonValue } : {})
    }
  });

  return NextResponse.json({ action });
}
