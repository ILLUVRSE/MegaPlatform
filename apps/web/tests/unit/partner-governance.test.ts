import { describe, expect, it } from "vitest";
import { evaluatePartnerActivation } from "@/lib/partnerGovernance";

describe("partner governance", () => {
  it("blocks module activation without required agreement", async () => {
    const result = await evaluatePartnerActivation({
      partnerId: "partner-alpha",
      moduleKey: "news",
      hasAgreement: false
    });
    expect(result.ok).toBe(false);
  });
});
