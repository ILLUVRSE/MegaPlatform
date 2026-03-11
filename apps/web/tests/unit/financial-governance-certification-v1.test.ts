import { describe, expect, it } from "vitest";
import { certifyFinancialGovernanceV1 } from "@/lib/financialGovernanceCertificationV1";

describe("financial governance certification v1", () => {
  it("certifies when required controls pass", async () => {
    const result = await certifyFinancialGovernanceV1({
      checkResults: {
        budget_controls: true,
        roi_controls: true,
        fraud_controls: true,
        audit_evidence: true
      }
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.certified).toBe(true);
  });
});
