import { describe, expect, it } from "vitest";
import { evaluateAudienceChoreographyEngine } from "@/lib/audienceChoreographyEngine";

describe("audience choreography engine", () => {
  it("supports deterministic patterns within safety caps", async () => {
    const result = await evaluateAudienceChoreographyEngine({
      patternId: "wave",
      participantCount: 4000,
      deterministicSeedProvided: true,
      requestedAmplitude: 0.7,
      requestedVelocity: 1.1
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.choreographyReady).toBe(true);
    expect(result.deterministicPatterns).toBe(true);
  });
});
