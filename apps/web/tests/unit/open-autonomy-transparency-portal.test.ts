import { describe, expect, it } from "vitest";
import { generateTransparencySnapshot } from "@/lib/openAutonomyTransparencyPortal";

describe("open autonomy transparency portal", () => {
  it("generates exposed transparency snapshots with evidence links", async () => {
    const result = await generateTransparencySnapshot({
      metrics: { autonomy_success_rate: 0.95, policy_breach_rate: 0.02 },
      evidenceLinks: ["docs/compliance/evidence/audit-bundle-latest.json"]
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.exposed).toBe(true);
  });
});
