import { describe, expect, it } from "vitest";
import { canAccessPremiumContent, canPurchaseItem, normalizePremiumPrice } from "@/lib/monetizationRules";

describe("monetization rules engine", () => {
  it("requires sign-in for premium content", () => {
    expect(canAccessPremiumContent({ isPremium: true, isSignedIn: false, isAdmin: false }).allowed).toBe(false);
  });

  it("normalizes premium prices to policy bounds", () => {
    expect(normalizePremiumPrice(1)).toBe(50);
    expect(normalizePremiumPrice(12000)).toBe(9999);
  });

  it("validates purchasable premium items", () => {
    expect(canPurchaseItem({ isPremium: false, price: null }).reason).toBe("already_free");
    expect(canPurchaseItem({ isPremium: true, price: null }).allowed).toBe(false);
    expect(canPurchaseItem({ isPremium: true, price: 399 }).allowed).toBe(true);
  });
});
