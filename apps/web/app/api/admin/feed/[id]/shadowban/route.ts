export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { enforceAdminPolicy, policyViolationResponse } from "@/lib/policyEnforcement";

const schema = z.object({
  shadowbanned: z.boolean().optional(),
  reason: z.string().trim().min(3).max(280).optional(),
  ticketId: z.string().trim().min(3).max(80).optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok || !auth.session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const post = await prisma.feedPost.findUnique({
    where: { id },
    select: { id: true, isPinned: true, isFeatured: true }
  });
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const nextState = parsed.data.shadowbanned ?? true;
  if (nextState) {
    const decision = await enforceAdminPolicy({
      adminId: auth.session.user.id,
      scope: "moderation",
      action: "content.takedown",
      target: {
        kind: "api",
        resource: "feed-post",
        operation: "shadowban",
        id
      },
      attributes: {
        isPinned: post.isPinned,
        isFeatured: post.isFeatured,
        requestedState: "shadowbanned",
        reason: parsed.data.reason ?? null,
        ticketId: parsed.data.ticketId ?? null
      }
    });

    if (!decision.ok) {
      return NextResponse.json({ error: decision.reason }, { status: 400 });
    }
    if (!decision.allow) {
      return policyViolationResponse(decision);
    }
  }
  await prisma.feedPost.update({ where: { id }, data: { isShadowbanned: nextState } });
  await writeAudit(auth.session.user.id, "feed:shadowban", `Shadowban=${nextState} for feed post ${id}`);
  return NextResponse.json({ ok: true });
}
