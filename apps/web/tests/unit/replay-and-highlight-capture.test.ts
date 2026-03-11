import { describe, expect, it } from "vitest";
import { evaluateReplayAndHighlightCapture } from "@/lib/replayAndHighlightCapture";

describe("replay and highlight capture", () => {
  it("ensures replay artifacts are queryable with deterministic timeline refs", async () => {
    const result = await evaluateReplayAndHighlightCapture({
      artifactsQueryable: true,
      deterministicTimelineRefs: true,
      captureDelayMs: 500
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.captureReady).toBe(true);
    expect(result.timelineDeterminismMet).toBe(true);
  });
});
