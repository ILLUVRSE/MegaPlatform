import { describe, expect, it } from "vitest";
import { evaluateAutonomyControlPlaneV3 } from "@/lib/autonomyControlPlaneV3";

describe("autonomy control plane v3", () => {
  it("aggregates policy checks and returns block/allow state", async () => {
    const result = await evaluateAutonomyControlPlaneV3({
      domain: "ops",
      attributes: { riskLevel: "low" },
      atIso: "2026-03-04T16:00:00.000Z",
      budget: {
        changeClass: "runtime",
        consumedUnits: 20,
        requestedUnits: 5
      },
      blastRadius: {
        actionId: "cpv3-130",
        riskScore: 0.25,
        affectedDomains: ["ops"],
        estimatedAffectedUsers: 100
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(typeof result.allowed).toBe("boolean");
    expect(result.checks.constraint.decision.length).toBeGreaterThan(0);
  });
});
