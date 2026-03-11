/**
 * Unit tests for playback sync helpers.
 * Request/response: validates estimate and drift correction logic.
 * Guard: none; pure functions.
 */
import { describe, expect, it } from "vitest";
import { applyDriftCorrection, estimatePlaybackPosition } from "@/app/party/lib/playback";

describe("playback", () => {
  it("estimates playback position based on leader time", () => {
    const leaderTime = 1_000;
    const position = estimatePlaybackPosition(leaderTime, 5_000, 1_500);
    expect(position).toBe(5_500);
  });

  it("applies smoothing for small drift", () => {
    const next = applyDriftCorrection(10_000, 10_400, 0.25, 1_200);
    expect(next).toBe(10_100);
  });

  it("snaps for large drift", () => {
    const next = applyDriftCorrection(1_000, 4_000, 0.25, 1_200);
    expect(next).toBe(4_000);
  });
});
