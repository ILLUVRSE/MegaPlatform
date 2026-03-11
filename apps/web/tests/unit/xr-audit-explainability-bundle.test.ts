import { describe, expect, it } from "vitest";
import { generateXrAuditExplainabilityBundle } from "@/lib/xrAuditExplainabilityBundle";

describe("xr audit explainability bundle", () => {
  it("builds audit bundle with rationale evidence links and outcomes", async () => {
    const result = await generateXrAuditExplainabilityBundle({
      traceabilityId: "xr-decision-2026-03-05-1",
      decisionRationale: "Biometric access disabled for regional compliance overlay.",
      evidenceLinks: ["docs/compliance/evidence/overlay.json", "docs/compliance/evidence/session.json"],
      outcome: "restrict",
      humanReviewer: "compliance-ops-1"
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bundleCompliant).toBe(true);
    expect(result.bundle.outcome).toBe("restrict");
  });
});
