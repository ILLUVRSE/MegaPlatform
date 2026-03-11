import { describe, expect, it } from "vitest";
import { canAccessShow, isMatureRating } from "@/lib/watchEntitlements";

describe("watch entitlements", () => {
  it("requires sign-in for premium shows", () => {
    const result = canAccessShow(
      { isPremium: true, maturityRating: null },
      { userId: null, role: null, isKidsProfile: false }
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("sign_in_required");
  });

  it("blocks mature titles on kids profile", () => {
    const result = canAccessShow(
      { isPremium: false, maturityRating: "TV-MA" },
      { userId: "user-1", role: "user", isKidsProfile: true }
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("kids_restricted");
  });

  it("allows admin bypass", () => {
    const result = canAccessShow(
      { isPremium: true, maturityRating: "TV-MA" },
      { userId: "admin-1", role: "admin", isKidsProfile: true }
    );
    expect(result.allowed).toBe(true);
  });

  it("recognizes mature ratings", () => {
    expect(isMatureRating("tv-ma")).toBe(true);
    expect(isMatureRating("TV-14")).toBe(false);
  });
});
