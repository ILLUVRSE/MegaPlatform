import { describe, expect, it } from "vitest";
import { canAccessShow, canDiscoverWatchContent, isMatureRating } from "@/lib/watchEntitlements";

describe("watch entitlements", () => {
  it("requires sign-in for premium shows", () => {
    const result = canAccessShow(
      { monetizationMode: "PREMIUM", maturityRating: null },
      { userId: null, role: null, isKidsProfile: false }
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("sign_in_required");
  });

  it("blocks mature titles on kids profile", () => {
    const result = canAccessShow(
      { monetizationMode: "FREE", maturityRating: "TV-MA" },
      { userId: "user-1", role: "user", isKidsProfile: true }
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("kids_restricted");
  });

  it("allows admin bypass", () => {
    const result = canAccessShow(
      { monetizationMode: "PREMIUM", maturityRating: "TV-MA" },
      { userId: "admin-1", role: "admin", isKidsProfile: true }
    );
    expect(result.allowed).toBe(true);
  });

  it("recognizes mature ratings", () => {
    expect(isMatureRating("tv-ma")).toBe(true);
    expect(isMatureRating("TV-14")).toBe(false);
  });

  it("blocks private titles", () => {
    const result = canAccessShow(
      { monetizationMode: "FREE", maturityRating: null, visibility: "PRIVATE" },
      { userId: "user-1", role: "user", isKidsProfile: false }
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("private");
  });

  it("blocks unlisted titles from discoverability", () => {
    expect(canDiscoverWatchContent({ visibility: "UNLISTED", allowedRegions: null }, "US")).toBe(false);
  });

  it("blocks region-restricted titles when a request region is known", () => {
    const result = canAccessShow(
      { monetizationMode: "FREE", maturityRating: null, allowedRegions: ["US", "CA"] },
      { userId: "user-1", role: "user", isKidsProfile: false, requestRegion: "GB" }
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("region_restricted");
  });

  it("requires matching entitlements when enabled", () => {
    const result = canAccessShow(
      {
        monetizationMode: "FREE",
        maturityRating: null,
        requiresEntitlement: true,
        entitlementKeys: ["watch:show:slug-1"]
      },
      { userId: "user-1", role: "user", isKidsProfile: false, activeEntitlementKeys: ["watch:show:slug-2"] }
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("entitlement_required");
  });

  it("requires sign-in for ticketed titles", () => {
    const result = canAccessShow(
      { monetizationMode: "TICKETED", maturityRating: null, entitlementKeys: ["watch:show:slug-1"] },
      { userId: null, role: null, isKidsProfile: false }
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("sign_in_required");
  });

  it("requires entitlement for signed-in ticketed titles", () => {
    const result = canAccessShow(
      { monetizationMode: "TICKETED", maturityRating: null, entitlementKeys: ["watch:show:slug-1"] },
      { userId: "user-1", role: "user", isKidsProfile: false, activeEntitlementKeys: [] }
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("entitlement_required");
  });
});
