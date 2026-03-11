import { describe, expect, it } from "vitest";
import { appendEmotionalSafetySignal } from "@/lib/emotionalSafetySignals";

describe("emotional safety signals v1", () => {
  it("flags controls when severity exceeds threshold", async () => {
    const result = await appendEmotionalSafetySignal({
      signalId: "sig-149-high",
      userId: "user-149",
      pattern: "doom_scroll",
      severity: 0.9,
      source: "ranking"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.controlsRequired).toBe(true);
  });

  it("records low-severity signals without forcing controls", async () => {
    const result = await appendEmotionalSafetySignal({
      signalId: "sig-149-low",
      userId: "user-149",
      pattern: "neutral",
      severity: 0.2,
      source: "engagement"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.controlsRequired).toBe(false);
  });
});
