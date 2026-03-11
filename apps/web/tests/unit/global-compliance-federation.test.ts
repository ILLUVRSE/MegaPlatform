import { describe, expect, it } from "vitest";
import { evaluateGlobalComplianceFederation } from "@/lib/globalComplianceFederation";

describe("global compliance federation", () => {
  it("enforces region overlays in runtime decisions", async () => {
    const result = await evaluateGlobalComplianceFederation({ actionId: "a-171", region: "eu", controls: ["gdpr"] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.compliant).toBe(false);
    expect(result.missing).toContain("dsa");
  });
});
