export type MonetizedItem = {
  isPremium: boolean;
  price: number | null;
};

export function canAccessPremiumContent(input: { isPremium: boolean; isSignedIn: boolean; isAdmin: boolean }) {
  if (input.isAdmin) return { allowed: true, reason: "admin_bypass" as const };
  if (input.isPremium && !input.isSignedIn) return { allowed: false, reason: "sign_in_required" as const };
  return { allowed: true, reason: "ok" as const };
}

export function normalizePremiumPrice(price: number | null | undefined) {
  if (price == null) return null;
  return Math.min(9999, Math.max(50, Math.trunc(price)));
}

export function canPurchaseItem(item: MonetizedItem) {
  if (!item.isPremium) return { allowed: false, reason: "already_free" as const };
  const normalized = normalizePremiumPrice(item.price);
  if (normalized == null) return { allowed: false, reason: "price_required" as const };
  return { allowed: true, reason: "ok" as const, price: normalized };
}
