import { describe, expect, it } from "vitest";
import { evaluateInteractiveNarrativeBranchingXr } from "@/lib/interactiveNarrativeBranchingXr";

describe("interactive narrative branching xr", () => {
  it("keeps branching deterministic and replay-auditable", async () => {
    const result = await evaluateInteractiveNarrativeBranchingXr({
      deterministicSeedProvided: true,
      replayAuditTrailEnabled: true,
      activeBranchFanout: 4
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.branchingReady).toBe(true);
    expect(result.replayAuditabilityMet).toBe(true);
  });
});
