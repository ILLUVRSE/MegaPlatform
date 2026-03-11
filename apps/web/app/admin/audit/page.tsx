/**
 * Admin audit log page.
 * Data: Prisma AdminAudit list with admin actor.
 * Guard: requireAdmin (RBAC).
 */
import { redirect } from "next/navigation";
import DataTable, { type DataColumn } from "@/components/admin/DataTable";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";

export default async function AuditPage() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    redirect("/auth/signin");
  }
  const audits = await prisma.adminAudit.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { admin: true }
  });

  const rows = audits.map((audit) => ({
    id: audit.id,
    action: audit.action,
    details: audit.details,
    admin: audit.admin.email,
    createdAt: audit.createdAt.toLocaleString()
  }));

  const columns: DataColumn<(typeof rows)[number]>[] = [
    { key: "action", header: "Action", render: (row) => row.action },
    { key: "details", header: "Details", render: (row) => row.details },
    { key: "admin", header: "Admin", render: (row) => row.admin },
    { key: "createdAt", header: "Created", render: (row) => row.createdAt }
  ];

  return <DataTable columns={columns} rows={rows} emptyMessage="No audits yet." />;
}
