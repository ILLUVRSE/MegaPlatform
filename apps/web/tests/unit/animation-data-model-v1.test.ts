import { describe, expect, it } from "vitest";
import { ingestAnimationDataModelV1 } from "@/lib/animationDataModelV1";

describe("animation data model v1", () => {
  it("validates centralized clip/state schemas at ingestion", async () => {
    const result = await ingestAnimationDataModelV1({
      clips: [{ clipId: "idle", durationMs: 1200, frameRate: 30 }],
      states: [{ stateId: "idle_state", clipId: "idle", loop: true }]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lifecycleContractValid).toBe(true);
    expect(result.validatedClipCount).toBe(1);
    expect(result.validatedStateCount).toBe(1);
    expect(result.orphanStates).toEqual([]);
  });
});
