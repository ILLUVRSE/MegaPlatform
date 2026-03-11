/**
 * Audit adapter resolution.
 * Default: DB adapter. Optional: console forwarding via AUDIT_ADAPTER=console.
 */
import { createConsoleAuditAdapter, createDbAuditAdapter } from "@illuvrse/audit";
import { prisma } from "@illuvrse/db";

export const auditAdapter =
  process.env.AUDIT_ADAPTER === "console"
    ? createConsoleAuditAdapter()
    : createDbAuditAdapter(prisma);

export async function writeAudit(adminId: string, action: string, details: string) {
  await auditAdapter.write({ adminId, action, details });
}
