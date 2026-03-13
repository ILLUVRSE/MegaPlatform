/**
 * Unit tests for playback sync helpers.
 * Request/response: validates estimate and drift correction logic.
 * Guard: none; pure functions.
 */
import { describe, expect, it } from "vitest";
import {
  applyDriftCorrection,
  estimatePlaybackPosition,
  repairPlaybackDrift,
  resolveAuthoritativePlaybackSnapshot,
  shouldSoftLockTimeline
} from "@/app/party/lib/playback";

describe("playback", () => {
  it("estimates playback position based on leader time", () => {
    const leaderTime = 1_000;
    const position = estimatePlaybackPosition(leaderTime, 5_000, 1_500);
    expect(position).toBe(5_500);
  });

  it("does not advance paused playback while estimating the authoritative position", () => {
    const position = estimatePlaybackPosition(1_000, 5_000, 2_500, "paused");
    expect(position).toBe(5_000);
  });

  it("applies smoothing for small drift", () => {
    const next = applyDriftCorrection(10_000, 10_400, 0.25, 1_200);
    expect(next).toBe(10_100);
  });

  it("snaps for large drift", () => {
    const next = applyDriftCorrection(1_000, 4_000, 0.25, 1_200);
    expect(next).toBe(4_000);
  });

  it("returns hold mode when drift is inside tolerance", () => {
    const result = repairPlaybackDrift(10_000, 10_100);
    expect(result).toEqual({
      driftMs: 100,
      nextPositionMs: 10_000,
      mode: "hold"
    });
  });

  it("resolves an authoritative snapshot using server time", () => {
    const snapshot = resolveAuthoritativePlaybackSnapshot(
      {
        currentIndex: 1,
        playbackState: "playing",
        leaderTime: 5_000,
        playbackPositionMs: 12_000,
        timelineRevision: 2,
        syncSequence: 7,
        lastAction: "seek",
        lastHeartbeatAt: 5_000
      },
      6_000
    );

    expect(snapshot).toMatchObject({
      currentIndex: 1,
      playbackState: "playing",
      leaderTime: 6_000,
      playbackPositionMs: 13_000,
      timelineRevision: 2,
      syncSequence: 7,
      lastAction: "seek",
      lastHeartbeatAt: 5_000
    });
  });

  it("soft-locks when the host rewrites the timeline", () => {
    expect(
      shouldSoftLockTimeline(
        {
          currentIndex: 0,
          playbackState: "playing",
          playbackPositionMs: 1_000
        },
        {
          currentIndex: 0,
          playbackPositionMs: 3_000
        }
      )
    ).toBe(true);
  });
});
