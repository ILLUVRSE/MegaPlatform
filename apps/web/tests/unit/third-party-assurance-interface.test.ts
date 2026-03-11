import { describe, expect, it } from "vitest";
import { queryThirdPartyAssurance } from "@/lib/thirdPartyAssuranceInterface";

describe("third-party assurance interface", () => {
  it("allows safe external assurance queries", async () => {
    const result = await queryThirdPartyAssurance({ assessorId: "external_auditor", artifactType: "evidence", artifactId: "bundle-latest" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.response.safeAccess).toBe(true);
  });
});
