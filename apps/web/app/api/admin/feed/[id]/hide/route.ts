export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { enforceAdminPolicy, policyViolationResponse } from "@/lib/policyEnforcement";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok || !auth.session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const post = await prisma.feedPost.findUnique({
    where: { id },
    select: { id: true, isPinned: true, isFeatured: true }
  });
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const decision = await enforceAdminPolicy({
    adminId: auth.session.user.id,
    scope: "moderation",
    action: "content.takedown",
    target: {
      kind: "api",
      resource: "feed-post",
      operation: "hide",
      id
    },
    attributes: {
      isPinned: post.isPinned,
      isFeatured: post.isFeatured,
      requestedState: "hidden",
      reason: typeof body.reason === "string" ? body.reason : null,
      ticketId: typeof body.ticketId === "string" ? body.ticketId : null
    }
  });

  if (!decision.ok) {
    return NextResponse.json({ error: decision.reason }, { status: 400 });
  }
  if (!decision.allow) {
    return policyViolationResponse(decision);
  }

  await prisma.feedPost.update({ where: { id }, data: { isHidden: true } });
  await writeAudit(auth.session.user.id, "feed:hide", `Hidden feed post ${id}`);
  return NextResponse.json({ ok: true });
}
