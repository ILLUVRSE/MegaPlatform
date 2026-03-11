import { describe, expect, it } from "vitest";
import { evaluateCutsceneSequencerV1 } from "@/lib/cutsceneSequencerV1";

describe("cutscene sequencer v1", () => {
  it("supports deterministic and versioned sequence playback", async () => {
    const result = await evaluateCutsceneSequencerV1({
      sequenceVersion: "v1.3.2",
      trackCount: 8,
      playbackJitterMs: 12,
      deterministicEventOrder: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sequencerReady).toBe(true);
    expect(result.playbackStable).toBe(true);
  });
});
