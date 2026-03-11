const ADMIN_PATH_PREFIXES = ["/admin", "/api/admin"] as const;
const WATCH_PATH_PREFIXES = ["/watch", "/api/watch"] as const;
const SESSION_PROTECTED_PATH_PREFIXES = [
  "/api/creator/control-center",
  "/api/creator/portability",
  "/api/onboarding/complete",
  "/api/party",
  "/api/storage/upload",
  "/api/studio",
  "/api/uploads"
] as const;
const PROFILE_EXEMPT_PATHS = ["/watch/profiles", "/watch/profiles/new", "/watch/movies"] as const;

type TokenLike = { role?: unknown; permissions?: unknown; disabled?: unknown } | null;

export function isAdminPath(pathname: string) {
  return ADMIN_PATH_PREFIXES.some((path) => pathname.startsWith(path));
}

export function isWatchPath(pathname: string) {
  return WATCH_PATH_PREFIXES.some((path) => pathname.startsWith(path));
}

export function isSessionProtectedPath(pathname: string) {
  return SESSION_PROTECTED_PATH_PREFIXES.some((path) => pathname.startsWith(path));
}

export function isProfileExemptPath(pathname: string) {
  return PROFILE_EXEMPT_PATHS.some((path) => pathname.startsWith(path));
}

export function getAdminDecision(token: TokenLike) {
  if (!token) return { allowed: false, status: 401 as const };
  if (token.disabled === true) return { allowed: false, status: 401 as const };
  const permissions = Array.isArray(token.permissions)
    ? token.permissions.filter((value): value is string => typeof value === "string")
    : [];
  const isAdmin = token.role === "admin" || permissions.includes("admin:*");
  if (!isAdmin) return { allowed: false, status: 403 as const };
  return { allowed: true, status: 200 as const };
}

export function getSessionDecision(token: TokenLike) {
  if (!token) return { allowed: false, status: 401 as const };
  if (token.disabled === true) return { allowed: false, status: 401 as const };
  return { allowed: true, status: 200 as const };
}

export const privilegedRouteMatcher = [
  "/admin/:path*",
  "/api/admin/:path*",
  "/watch/:path*",
  "/api/watch/:path*",
  "/api/creator/control-center/:path*",
  "/api/creator/portability/:path*",
  "/api/onboarding/complete/:path*",
  "/api/party/:path*",
  "/api/storage/upload/:path*",
  "/api/studio/:path*",
  "/api/uploads/:path*"
];
