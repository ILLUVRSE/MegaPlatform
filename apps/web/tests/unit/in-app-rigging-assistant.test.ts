import { describe, expect, it } from "vitest";
import { evaluateInAppRiggingAssistant } from "@/lib/inAppRiggingAssistant";

describe("in-app rigging assistant", () => {
  it("requires valid rig output with review checkpoints", async () => {
    const result = await evaluateInAppRiggingAssistant({
      generatedRigValid: true,
      reviewCheckpointApproved: true,
      generatedBoneCount: 94
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.assistantReady).toBe(true);
    expect(result.checkpointMet).toBe(true);
  });
});
