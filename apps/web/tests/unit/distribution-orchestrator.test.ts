import { describe, expect, it } from "vitest";
import { planDistributionActions } from "@/lib/distributionOrchestrator";

describe("distribution orchestrator", () => {
  it("plans scheduled actions from ranked candidates", () => {
    const planned = planDistributionActions([
      { id: "post-1", type: "SHORT", score: 12 },
      { id: "post-2", type: "GAME", score: 10 }
    ]);
    expect(planned).toHaveLength(2);
    expect(planned[0]?.actionType).toBe("feature_in_home");
    expect(planned[1]?.module).toBe("games");
  });
});
