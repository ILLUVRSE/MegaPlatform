import { AuthzError, requireAdmin as requireAdminPrincipal } from "@/lib/authz";

type AdminSession = {
  user: {
    id: string;
    role?: string | null;
  };
};

export async function requireAdmin(): Promise<
  { ok: true; session: AdminSession; status: 200 } | { ok: false; session: null; status: 401 | 403 }
> {
  try {
    const principal = await requireAdminPrincipal();
    return {
      ok: true,
      status: 200,
      session: {
        user: {
          id: principal.userId,
          role: principal.role
        }
      }
    };
  } catch (error) {
    if (error instanceof AuthzError) {
      return { ok: false, session: null, status: error.status };
    }
    throw error;
  }
}
