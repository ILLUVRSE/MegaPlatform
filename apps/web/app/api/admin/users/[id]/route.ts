export const dynamic = "force-dynamic";

/**
 * User detail API.
 * PUT: { role, disabled } -> { id }
 * Guard: requireAdmin (RBAC)
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { enforceAdminPolicy, policyViolationResponse } from "@/lib/policyEnforcement";

const userSchema = z.object({
  role: z.string().min(1),
  disabled: z.boolean(),
  reason: z.string().trim().min(3).max(280).optional(),
  ticketId: z.string().trim().min(3).max(80).optional()
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok || !auth.session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = userSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, disabled: true }
  });
  if (!currentUser) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (parsed.data.disabled) {
    const decision = await enforceAdminPolicy({
      adminId: auth.session.user.id,
      scope: "admin",
      action: "user.ban",
      target: {
        kind: "api",
        resource: "user",
        operation: "ban",
        id
      },
      attributes: {
        targetRole: currentUser.role,
        alreadyDisabled: currentUser.disabled,
        requestedDisabled: parsed.data.disabled,
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

  const user = await prisma.user.update({
    where: { id },
    data: {
      role: parsed.data.role,
      disabled: parsed.data.disabled
    }
  });

  await writeAudit(auth.session.user.id, "users:update", `Updated user ${user.email}`);

  return NextResponse.json({ id: user.id });
}
