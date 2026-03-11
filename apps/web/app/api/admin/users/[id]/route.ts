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

const userSchema = z.object({
  role: z.string().min(1),
  disabled: z.boolean()
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
