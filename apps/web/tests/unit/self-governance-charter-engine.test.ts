import { describe, expect, it } from "vitest";
import { evaluateSelfGovernanceCharter } from "@/lib/selfGovernanceCharterEngine";

describe("self-governance charter engine", () => {
  it("machine-evaluates charter constraints for high-impact decisions", async () => {
    const result = await evaluateSelfGovernanceCharter({ decisionId: "d", impactLevel: "high", principles: ["safety"] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.machineEvaluable).toBe(true);
    expect(result.charterCompliant).toBe(false);
  });
});
