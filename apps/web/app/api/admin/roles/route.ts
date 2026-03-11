export const dynamic = "force-dynamic";

/**
 * Roles API.
 * GET: list roles
 * POST: { name, permissions } -> { id }
 * PUT: { id, name, permissions } -> { id }
 * Guard: requireAdmin (RBAC)
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const roleSchema = z.object({
  name: z.string().min(1),
  permissions: z.string().optional().default("")
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roles = await prisma.role.findMany({
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({
    data: roles.map((role) => ({
      id: role.id,
      name: role.name,
      permissions: Array.isArray(role.permissions) ? role.permissions : []
    }))
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok || !auth.session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = roleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const permissions = parsed.data.permissions
    ? parsed.data.permissions.split(",").map((item) => item.trim()).filter(Boolean)
    : [];

  const role = await prisma.role.create({
    data: {
      name: parsed.data.name,
      permissions
    }
  });

  await writeAudit(auth.session.user.id, "roles:create", `Created role ${role.name}`);

  return NextResponse.json({ id: role.id });
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok || !auth.session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = roleSchema.extend({ id: z.string().min(1) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const permissions = parsed.data.permissions
    ? parsed.data.permissions.split(",").map((item) => item.trim()).filter(Boolean)
    : [];

  const role = await prisma.role.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      permissions
    }
  });

  await writeAudit(auth.session.user.id, "roles:update", `Updated role ${role.name}`);

  return NextResponse.json({ id: role.id });
}
