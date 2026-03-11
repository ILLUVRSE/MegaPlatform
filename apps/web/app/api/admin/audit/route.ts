export const dynamic = "force-dynamic";

/**
 * Admin audit API.
 * GET: list audit entries
 * Guard: requireAdmin (RBAC)
 */
import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const audits = await prisma.adminAudit.findMany({
    orderBy: { createdAt: "desc" },
    include: { admin: true }
  });

  return NextResponse.json({
    data: audits.map((audit) => ({
      id: audit.id,
      action: audit.action,
      details: audit.details,
      adminEmail: audit.admin.email,
      createdAt: audit.createdAt
    }))
  });
}
