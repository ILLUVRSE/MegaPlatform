/**
 * Playback sync utilities for leader heartbeat drift correction.
 * Request/response: pure helper functions for estimating positions.
 * Guard: none; safe for client and server usage.
 */
export type PlaybackHeartbeat = {
  leaderTime: number;
  playbackPositionMs: number;
  currentIndex: number;
  playbackState: "idle" | "playing" | "paused";
  leaderId: string;
};

export function estimatePlaybackPosition(
  leaderTime: number,
  playbackPositionMs: number,
  now: number
) {
  return playbackPositionMs + Math.max(0, now - leaderTime);
}

export function applyDriftCorrection(
  currentPositionMs: number,
  targetPositionMs: number,
  smoothing = 0.25,
  snapThresholdMs = 1200
) {
  const drift = targetPositionMs - currentPositionMs;
  if (Math.abs(drift) >= snapThresholdMs) {
    return targetPositionMs;
  }
  return currentPositionMs + drift * smoothing;
}

export function nextPlaybackPosition(
  currentPositionMs: number,
  deltaMs: number,
  playbackState: "idle" | "playing" | "paused"
) {
  if (playbackState !== "playing") return currentPositionMs;
  return currentPositionMs + deltaMs;
}
