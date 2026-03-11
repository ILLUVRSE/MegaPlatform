import { canAccessPremiumContent } from "@/lib/monetizationRules";

export type WatchViewer = {
  userId: string | null;
  role: string | null;
  isKidsProfile: boolean;
};

export type WatchShowAccessInput = {
  isPremium: boolean;
  maturityRating: string | null;
};

export type WatchAccessDecision = {
  allowed: boolean;
  reason: "ok" | "sign_in_required" | "kids_restricted";
};

const MATURE_RATINGS = new Set(["R", "NC-17", "TV-MA", "18+", "MATURE"]);

export function isMatureRating(maturityRating: string | null | undefined) {
  if (!maturityRating) return false;
  return MATURE_RATINGS.has(maturityRating.trim().toUpperCase());
}

export function canAccessShow(input: WatchShowAccessInput, viewer: WatchViewer): WatchAccessDecision {
  const isAdmin = viewer.role === "admin";

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
