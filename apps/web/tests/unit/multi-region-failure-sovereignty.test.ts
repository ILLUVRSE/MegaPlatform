import { describe, expect, it } from "vitest";
import { evaluateMultiRegionFailureSovereignty } from "@/lib/multiRegionFailureSovereignty";

describe("multi-region failure sovereignty", () => {
  it("switches to degraded action limits when primary-region policy is violated", async () => {
    const result = await evaluateMultiRegionFailureSovereignty({
      regions: [
        { id: "us-east-1", available: false, controlStates: [] },
        { id: "us-west-2", available: false, controlStates: [] }
      ]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sovereign).toBe(false);
    expect(result.actionLimit).toBe("restricted");
  });
});
