import { describe, expect, it } from "vitest";
import { normalizeXrInputIntents } from "@/lib/inputAbstractionLayerXr";

describe("input abstraction layer xr", () => {
  it("normalizes controller, hand, gaze, and voice actions into one intent api", async () => {
    const result = await normalizeXrInputIntents({
      signals: [
        { device: "controller", action: "trigger" },
        { device: "hand", action: "pinch" },
        { device: "gaze", action: "look_dwell" },
        { device: "voice", action: "voice_confirm" }
      ]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.normalizedApi).toBe(true);
    expect(new Set(result.normalizedIntents.map((i) => i.intent))).toEqual(new Set(["select", "focus", "confirm"]));
  });
});
