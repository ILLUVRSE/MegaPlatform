import { describe, expect, it } from "vitest";
import { evaluateContinuousComplianceCertificationGate } from "@/lib/continuousComplianceCertificationGate";

describe("continuous compliance certification gate", () => {
  it("constrains operations when certifications are missing", async () => {
    const result = await evaluateContinuousComplianceCertificationGate({ activeCertifications: ["financial_v1"], requestedCapabilities: ["autonomous_publish"] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.certified).toBe(false);
    expect(result.blockedCapabilities).toContain("autonomous_publish");
  });
});
