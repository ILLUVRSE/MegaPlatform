import { describe, expect, it } from "vitest";
import { evaluateAnimationEventTimeline } from "@/lib/animationEventTimeline";

describe("animation event timeline", () => {
  it("keeps deterministic event ordering and action consumers", async () => {
    const result = await evaluateAnimationEventTimeline({
      clipId: "run",
      events: [
        { eventId: "step-left", frame: 10, consumer: "gameplay" },
        { eventId: "step-right", frame: 20, consumer: "ux" }
      ]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.deterministicOrder).toBe(true);
    expect(result.consumableByActions).toBe(true);
  });
});
