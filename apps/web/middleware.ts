import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { assertAuthSecurityConfig } from "@/lib/env";
import { PROFILE_COOKIE } from "@/lib/watchProfiles";
import {
  getAdminDecision,
  getSessionDecision,
  isAdminPath,
  isProfileExemptPath,
  isSessionProtectedPath,
  isWatchPath
} from "@/src/domains/platform-core/auth/middlewarePolicy";

assertAuthSecurityConfig();

function withSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  return response;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const adminPath = isAdminPath(pathname);
  const watchPath = isWatchPath(pathname);
  const sessionProtectedPath = isSessionProtectedPath(pathname);
  const token = (await getToken({ req, secret: process.env.NEXTAUTH_SECRET }).catch(() => null)) as
    | { role?: unknown; permissions?: unknown; disabled?: unknown }
    | null;

  if (!adminPath) {
    if (sessionProtectedPath) {
      const decision = getSessionDecision(token);
      if (!decision.allowed) {
        return withSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: decision.status }));
      }
    }

    if (watchPath && token?.disabled === true) {
      if (pathname.startsWith("/api")) {
        return withSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
      }
      const signInUrl = new URL("/auth/signin", req.url);
      signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
      return withSecurityHeaders(NextResponse.redirect(signInUrl));
    }

    if (watchPath && token) {
      const profileCookie = req.cookies.get(PROFILE_COOKIE)?.value ?? null;
      const exempt = isProfileExemptPath(pathname);

      if (!profileCookie && !exempt) {
        if (pathname.startsWith("/api")) {
          return withSecurityHeaders(NextResponse.json({ error: "Select profile" }, { status: 401 }));
        }
        const profilesUrl = new URL("/watch/profiles", req.url);
        profilesUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
        return withSecurityHeaders(NextResponse.redirect(profilesUrl));
      }
    }

    return withSecurityHeaders(NextResponse.next());
  }

  const decision = getAdminDecision(token);

  if (!decision.allowed) {
    if (pathname.startsWith("/api")) {
      const message = decision.status === 403 ? "Forbidden" : "Unauthorized";
      return withSecurityHeaders(NextResponse.json({ error: message }, { status: decision.status }));
    }

    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    if (decision.status === 403) {
      signInUrl.searchParams.set("error", "forbidden");
    }
    return withSecurityHeaders(NextResponse.redirect(signInUrl));
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
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
  ]
};
