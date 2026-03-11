import { describe, expect, it } from "vitest";
import { evaluateEventReadinessCertificationGate } from "@/lib/eventReadinessCertificationGate";

describe("event readiness certification gate", () => {
  it("constrains go-live actions for non-certified event states", async () => {
    const result = await evaluateEventReadinessCertificationGate({
      certified: false,
      readinessScore: 0.92,
      goLiveRequested: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.goLiveAllowed).toBe(false);
    expect(result.constrainedByGate).toBe(true);
  });
});
