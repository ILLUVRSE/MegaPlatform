import { describe, expect, it } from "vitest";
import { resolveIdentityContext } from "@/lib/identity";

describe("identity contract", () => {
  it("returns authenticated_profile when principal and profile cookie exist", () => {
    const request = new Request("http://localhost", {
      headers: {
        cookie: "ILLUVRSE_PROFILE_ID=profile-1; ILLUVRSE_ANON_ID=bad-token"
      }
    });

    const identity = resolveIdentityContext({
      request,
      principal: { userId: "user-1", role: "user" }
    });

    expect(identity.mode).toBe("authenticated_profile");
    expect(identity.userId).toBe("user-1");
    expect(identity.profileId).toBe("profile-1");
  });

  it("returns authenticated_no_profile when signed in without profile", () => {
    const request = new Request("http://localhost");
    const identity = resolveIdentityContext({ request, principal: { userId: "user-2", role: "admin" } });

    expect(identity.mode).toBe("authenticated_no_profile");
    expect(identity.userId).toBe("user-2");
    expect(identity.profileId).toBeNull();
  });

  it("returns anonymous when principal is missing", () => {
    const request = new Request("http://localhost");
    const identity = resolveIdentityContext({ request, principal: null });

    expect(identity.mode).toBe("anonymous");
    expect(identity.userId).toBeNull();
    expect(identity.profileId).toBeNull();
  });
});
