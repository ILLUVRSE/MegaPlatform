import { getServerSession } from "next-auth";
import { prisma } from "@illuvrse/db";
import { authOptions } from "@/lib/auth";

export type Principal = {
  userId: string;
  role: string;
  permissions: string[];
  email: string | null;
  name: string | null;
};

export class AuthzError extends Error {
  status: 401 | 403;

  constructor(status: 401 | 403, message: string) {
    super(message);
    this.status = status;
  }
}

export async function getPrincipal(_request?: Request): Promise<Principal | null> {
  const session = (await getServerSession(authOptions).catch(() => null)) as
    | {
        user?: {
          id?: string;
        };
      }
    | null;

  if (!session?.user?.id) {
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, disabled: true, email: true, name: true }
  });

  if (!dbUser || dbUser.disabled) {
    return null;
  }

  const role = await prisma.role.findUnique({
    where: { name: dbUser.role },
    select: { permissions: true }
  });

  const permissions = Array.isArray(role?.permissions)
    ? role.permissions.filter((value): value is string => typeof value === "string")
    : [];

  return {
    userId: dbUser.id,
    role: dbUser.role,
    permissions,
    email: dbUser.email ?? null,
    name: dbUser.name ?? null
  };
}

export async function requireSession(request?: Request) {
  const principal = await getPrincipal(request);
  if (!principal) {
    throw new AuthzError(401, "Unauthorized");
  }
  return principal;
}

export async function requireAdmin(request?: Request) {
  const principal = await requireSession(request);
  if (principal.role !== "admin" && !principal.permissions.includes("admin:*")) {
    throw new AuthzError(403, "Forbidden");
  }
  return principal;
}

export async function requireCreatorOrAdmin(request: Request | undefined, resourceOwnerId: string | null) {
  const principal = await requireSession(request);
  if (principal.role === "admin" || principal.permissions.includes("admin:*")) {
    return principal;
  }
  if (!resourceOwnerId || principal.userId !== resourceOwnerId) {
    throw new AuthzError(403, "Forbidden");
  }
  return principal;
}
