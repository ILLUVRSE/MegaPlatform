import { describe, expect, it } from "vitest";
import { evaluateMarketplaceIntegrity } from "@/lib/marketplaceIntegrityMonitor";

describe("marketplace integrity monitor", () => {
  it("surfaces remediation actions for high fraud risk", async () => {
    const result = await evaluateMarketplaceIntegrity({ entityId: "creator-167", fraudRisk: 0.9, violationsLast30d: 2 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("blocked");
    expect(result.remediation.length).toBeGreaterThan(0);
  });
});
