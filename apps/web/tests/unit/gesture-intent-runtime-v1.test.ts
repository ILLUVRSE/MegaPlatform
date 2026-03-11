import { describe, expect, it } from "vitest";
import { resolveGestureIntents } from "@/lib/gestureIntentRuntimeV1";

describe("gesture intent runtime v1", () => {
  it("maps gestures to stable intents deterministically", async () => {
    const result = await resolveGestureIntents({
      surface: "xr_menu",
      gestures: [
        { name: "pinch", confidence: 0.95 },
        { name: "swipe_left", confidence: 0.9 }
      ]
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.deterministic).toBe(true);
    expect(result.resolved.map((x) => x.intent)).toEqual(["select", "navigate_prev"]);
  });
});
