import { describe, expect, it } from "vitest";
import { issueFederatedAccess } from "@/lib/federationGateway";

describe("federation gateway", () => {
  it("grants only policy-allowed scopes for trusted issuers", async () => {
    const result = await issueFederatedAccess({
      issuer: "illuvrse-internal",
      subject: "user-1",
      scopes: ["profile:read", "admin:*"]
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.token.scopes).toContain("profile:read");
      expect(result.token.scopes).not.toContain("admin:*");
    }
  });
});
