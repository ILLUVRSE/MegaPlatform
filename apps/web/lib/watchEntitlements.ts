import { prisma } from "@illuvrse/db";
import { canAccessPremiumContent } from "@/lib/monetizationRules";

export type WatchVisibility = "PUBLIC" | "PRIVATE" | "UNLISTED";

export type WatchViewer = {
  userId: string | null;
  role: string | null;
  isKidsProfile: boolean;
  requestRegion?: string | null;
  activeEntitlementKeys?: string[];
};

export type WatchShowAccessInput = {
  isPremium: boolean;
  maturityRating: string | null;
  visibility?: WatchVisibility | null;
  allowedRegions?: string[] | null;
  requiresEntitlement?: boolean;
  entitlementKeys?: string[];
};

export type WatchAccessDecision = {
  allowed: boolean;
  reason:
    | "ok"
    | "sign_in_required"
    | "kids_restricted"
    | "private"
    | "unlisted"
    | "region_restricted"
    | "entitlement_required";
};

export type WatchDiscoveryInput = Pick<WatchShowAccessInput, "visibility" | "allowedRegions">;

const MATURE_RATINGS = new Set(["R", "NC-17", "TV-MA", "18+", "MATURE"]);

function normalizeRegionCode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase() ?? "";
  return normalized.length >= 2 ? normalized : null;
}

export function normalizeAllowedRegions(value: string[] | null | undefined) {
  if (!value || value.length === 0) {
    return null;
  }

  const normalized = Array.from(
    new Set(
      value
        .map((region) => normalizeRegionCode(region))
        .filter((region): region is string => Boolean(region))
    )
  );

  return normalized.length > 0 ? normalized : null;
}

export function isMatureRating(maturityRating: string | null | undefined) {
  if (!maturityRating) return false;
  return MATURE_RATINGS.has(maturityRating.trim().toUpperCase());
}

export function isWatchRegionAllowed(allowedRegions: string[] | null | undefined, requestRegion: string | null | undefined) {
  const normalizedRegions = normalizeAllowedRegions(allowedRegions);
  if (!normalizedRegions) {
    return true;
  }

  const normalizedRequestRegion = normalizeRegionCode(requestRegion);
  if (!normalizedRequestRegion) {
    return true;
  }

  return normalizedRegions.includes(normalizedRequestRegion);
}

export function canDiscoverWatchContent(input: WatchDiscoveryInput, requestRegion?: string | null) {
  const visibility = input.visibility ?? "PUBLIC";
  if (visibility !== "PUBLIC") {
    return false;
  }

  return isWatchRegionAllowed(input.allowedRegions, requestRegion);
}

export function canAccessShow(
  input: WatchShowAccessInput,
  viewer: WatchViewer,
  options?: { allowUnlisted?: boolean }
): WatchAccessDecision {
  const isAdmin = viewer.role === "admin";
  const visibility = input.visibility ?? "PUBLIC";
  const allowUnlisted = options?.allowUnlisted ?? false;

  if (!isAdmin && visibility === "PRIVATE") {
    return { allowed: false, reason: "private" };
  }

  if (!isAdmin && visibility === "UNLISTED" && !allowUnlisted) {
    return { allowed: false, reason: "unlisted" };
  }

  if (!isAdmin && !isWatchRegionAllowed(input.allowedRegions, viewer.requestRegion)) {
    return { allowed: false, reason: "region_restricted" };
  }

  if (!isAdmin && input.requiresEntitlement) {
    if (!viewer.userId) {
      return { allowed: false, reason: "sign_in_required" };
    }

    const activeEntitlementKeys = new Set(viewer.activeEntitlementKeys ?? []);
    const entitlementKeys = input.entitlementKeys ?? [];
    if (entitlementKeys.length > 0 && !entitlementKeys.some((key) => activeEntitlementKeys.has(key))) {
      return { allowed: false, reason: "entitlement_required" };
    }
  }

  const premiumDecision = canAccessPremiumContent({
    isPremium: input.isPremium,
    isSignedIn: Boolean(viewer.userId),
    isAdmin
  });
  if (!premiumDecision.allowed) {
    return { allowed: false, reason: "sign_in_required" };
  }

  if (!isAdmin && viewer.isKidsProfile && isMatureRating(input.maturityRating)) {
    return { allowed: false, reason: "kids_restricted" };
  }

  return { allowed: true, reason: "ok" };
}

export function buildShowEntitlementKeys(show: { id: string; slug: string; sourceShowProjectId?: string | null }) {
  return [
    `watch:show:${show.id}`,
    `watch:show:${show.slug}`,
    ...(show.sourceShowProjectId ? [`watch:show:${show.sourceShowProjectId}`] : [])
  ];
}

export function buildEpisodeEntitlementKeys(
  episode: { id: string; sourceShowEpisodeId?: string | null },
  show?: { id: string; slug: string; sourceShowProjectId?: string | null }
) {
  return [
    `watch:episode:${episode.id}`,
    ...(episode.sourceShowEpisodeId ? [`watch:episode:${episode.sourceShowEpisodeId}`] : []),
    ...(show ? buildShowEntitlementKeys(show) : [])
  ];
}

export async function listActiveEntitlementKeysForUser(userId: string | null) {
  if (!userId) {
    return [];
  }

  const rows = await prisma.platformEntitlement.findMany({
    where: {
      userId,
      status: "ACTIVE",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
    },
    select: { entitlementKey: true }
  });

  return rows.map((row) => row.entitlementKey);
}
