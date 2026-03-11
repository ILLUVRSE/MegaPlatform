/**
 * Audit adapter interface and built-in adapters.
 * Guard: server-side only.
 */
type PrismaAuditClient = {
  adminAudit: {
    create: (args: {
      data: {
        adminId: string;
        action: string;
        details: string;
      };
    }) => Promise<unknown>;
  };
};

export type AdminAuditPayload = {
  adminId: string;
  action: string;
  details: string;
};

export interface AuditAdapter {
  write(payload: AdminAuditPayload): Promise<void>;
}

export function createDbAuditAdapter(prisma: PrismaAuditClient): AuditAdapter {
  return {
    async write(payload) {
      await prisma.adminAudit.create({
        data: {
          adminId: payload.adminId,
          action: payload.action,
          details: payload.details
        }
      });
    }
  };
}

export function createConsoleAuditAdapter(): AuditAdapter {
  return {
    async write(payload) {
      console.log("[audit]", JSON.stringify(payload));
    }
  };
}
