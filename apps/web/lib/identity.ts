import { ANON_COOKIE_NAME, getAnonIdFromRequest } from "@/lib/anon";
import { prisma } from "@illuvrse/db";
import { PROFILE_COOKIE, getProfileIdFromCookie } from "@/lib/watchProfiles";

const db = prisma as any;

export type IdentityContext = {
  userId: string | null;
  role: string | null;
  anonId: string | null;
  profileId: string | null;
  creatorProfileId: string | null;
  creatorHandle: string | null;
  presence: {
    sessionKey: string;
    modules: string[];
    isLive: boolean;
  };
  mode: "authenticated_profile" | "authenticated_no_profile" | "anonymous";
};

export function resolveIdentityContext(input: {
  request: Request;
  principal?: { userId?: string | null; role?: string | null } | null;
}): IdentityContext {
  const userId = input.principal?.userId ?? null;
  const role = input.principal?.role ?? null;
  const profileId = getProfileIdFromCookie(input.request.headers.get("cookie"));
  const anonId = getAnonIdFromRequest(input.request);

  if (userId && profileId) {
    return {
      userId,
      role,
      profileId,
      anonId,
      creatorProfileId: null,
      creatorHandle: null,
      presence: {
        sessionKey: userId ? `user:${userId}` : anonId ? `anon:${anonId}` : "anonymous:guest",
        modules: [],
        isLive: false
      },
      mode: "authenticated_profile"
    };
  }

  if (userId) {
    return {
      userId,
      role,
      profileId: null,
      anonId,
      creatorProfileId: null,
      creatorHandle: null,
      presence: {
        sessionKey: `user:${userId}`,
        modules: [],
        isLive: false
      },
      mode: "authenticated_no_profile"
    };
  }

  return {
    userId: null,
    role: null,
    profileId: null,
    anonId,
    creatorProfileId: null,
    creatorHandle: null,
    presence: {
      sessionKey: anonId ? `anon:${anonId}` : "anonymous:guest",
      modules: [],
      isLive: false
    },
    mode: "anonymous"
  };
}

export async function resolveFullIdentityContext(input: {
  request: Request;
  principal?: { userId?: string | null; role?: string | null } | null;
}) {
  const base = resolveIdentityContext(input);
  if (!base.userId) return base;

  const [creatorProfile, presenceRows] = await Promise.all([
    prisma.creatorProfile.findUnique({
      where: { userId: base.userId },
      select: { id: true, handle: true }
    }),
    db.platformPresence.findMany({
      where: { userId: base.userId },
      orderBy: { lastSeenAt: "desc" },
      take: 8
    })
  ]);

  return {
    ...base,
    creatorProfileId: creatorProfile?.id ?? null,
    creatorHandle: creatorProfile?.handle ?? null,
    presence: {
      sessionKey: `user:${base.userId}`,
      modules: [...new Set(presenceRows.map((row) => row.module))],
      isLive: presenceRows.some((row) => Date.now() - row.lastSeenAt.getTime() < 5 * 60 * 1000)
    }
  };
}

export const IDENTITY_COOKIE_KEYS = {
  anon: ANON_COOKIE_NAME,
  profile: PROFILE_COOKIE
} as const;
