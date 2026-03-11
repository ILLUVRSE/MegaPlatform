import { describe, expect, it } from "vitest";
import { evaluateSharedLiveEventStages } from "@/lib/sharedLiveEventStages";

describe("shared live event stages", () => {
  it("productionizes stage, audience, and host controls state", async () => {
    const result = await evaluateSharedLiveEventStages({
      stageStateFields: ["sceneId", "cueId", "timelineTick"],
      audienceStateFields: ["segmentLoads", "engagementMode"],
      hostControlCapabilities: ["cue_dispatch", "safety_override", "audience_sync"]
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.productionized).toBe(true);
  });
});
