/**
 * Playback sync utilities for leader heartbeat drift correction.
 * Request/response: pure helper functions for estimating positions.
 * Guard: none; safe for client and server usage.
 */
import type { PartyPlaybackSnapshot, PlaybackAction, PlaybackState } from "@illuvrse/world-state";

export type PlaybackHeartbeat = {
  leaderTime: number;
  playbackPositionMs: number;
  currentIndex: number;
  playbackState: PlaybackState;
  leaderId: string;
};

export type DriftRepairMode = "hold" | "smooth" | "snap";

export type DriftRepairResult = {
  driftMs: number;
  nextPositionMs: number;
  mode: DriftRepairMode;
};

export type DriftRepairOptions = {
  toleranceMs?: number;
  smoothing?: number;
  snapThresholdMs?: number;
};

export type AuthoritativePlaybackSnapshot = PartyPlaybackSnapshot & {
  leaderTime: number;
  playbackPositionMs: number;
  timelineRevision: number;
  syncSequence: number;
  lastAction: PlaybackAction;
  lastHeartbeatAt: number;
};

const DEFAULT_TOLERANCE_MS = 180;
const DEFAULT_SMOOTHING = 0.35;
const DEFAULT_SNAP_THRESHOLD_MS = 900;
export const PLAYBACK_TIMELINE_REWRITE_THRESHOLD_MS = 1_200;
export const PLAYBACK_SOFT_LOCK_MS = 1_500;

export function estimatePlaybackPosition(
  leaderTime: number,
  playbackPositionMs: number,
  now: number,
  playbackState: PlaybackState = "playing"
) {
  if (playbackState !== "playing") {
    return playbackPositionMs;
  }
  return playbackPositionMs + Math.max(0, now - leaderTime);
}

export function repairPlaybackDrift(
  currentPositionMs: number,
  targetPositionMs: number,
  options: DriftRepairOptions = {}
): DriftRepairResult {
  const toleranceMs = options.toleranceMs ?? DEFAULT_TOLERANCE_MS;
  const smoothing = options.smoothing ?? DEFAULT_SMOOTHING;
  const snapThresholdMs = options.snapThresholdMs ?? DEFAULT_SNAP_THRESHOLD_MS;
  const drift = targetPositionMs - currentPositionMs;
  if (Math.abs(drift) <= toleranceMs) {
    return {
      driftMs: drift,
      nextPositionMs: currentPositionMs,
      mode: "hold"
    };
  }
  if (Math.abs(drift) >= snapThresholdMs) {
    return {
      driftMs: drift,
      nextPositionMs: targetPositionMs,
      mode: "snap"
    };
  }
  return {
    driftMs: drift,
    nextPositionMs: currentPositionMs + drift * smoothing,
    mode: "smooth"
  };
}

export function applyDriftCorrection(
  currentPositionMs: number,
  targetPositionMs: number,
  smoothing = DEFAULT_SMOOTHING,
  snapThresholdMs = DEFAULT_SNAP_THRESHOLD_MS
) {
  return repairPlaybackDrift(currentPositionMs, targetPositionMs, {
    smoothing,
    snapThresholdMs
  }).nextPositionMs;
}

export function nextPlaybackPosition(
  currentPositionMs: number,
  deltaMs: number,
  playbackState: PlaybackState
) {
  if (playbackState !== "playing") return currentPositionMs;
  return currentPositionMs + deltaMs;
}

export function resolveAuthoritativePlaybackSnapshot(
  playback: PartyPlaybackSnapshot | null | undefined,
  now: number,
  fallback: Partial<AuthoritativePlaybackSnapshot> = {}
): AuthoritativePlaybackSnapshot {
  const playbackState = playback?.playbackState ?? fallback.playbackState ?? "idle";
  const leaderTime = playback?.leaderTime ?? fallback.leaderTime ?? now;
  const playbackPositionMs = estimatePlaybackPosition(
    leaderTime,
    playback?.playbackPositionMs ?? fallback.playbackPositionMs ?? 0,
    now,
    playbackState
  );

  return {
    currentIndex: playback?.currentIndex ?? fallback.currentIndex ?? 0,
    playbackState,
    leaderTime: now,
    playbackPositionMs,
    leaderId: playback?.leaderId ?? fallback.leaderId ?? null,
    timelineRevision: playback?.timelineRevision ?? fallback.timelineRevision ?? 0,
    syncSequence: playback?.syncSequence ?? fallback.syncSequence ?? 0,
    softLockUntil: playback?.softLockUntil,
    lastAction: playback?.lastAction ?? fallback.lastAction ?? "heartbeat",
    lastHeartbeatAt: playback?.lastHeartbeatAt ?? fallback.lastHeartbeatAt ?? now
  };
}

export function shouldSoftLockTimeline(
  previousPlayback: PartyPlaybackSnapshot | null | undefined,
  nextPlayback: Pick<PartyPlaybackSnapshot, "currentIndex" | "playbackPositionMs">,
  thresholdMs = PLAYBACK_TIMELINE_REWRITE_THRESHOLD_MS
) {
  if (!previousPlayback) {
    return false;
  }
  if (previousPlayback.currentIndex !== nextPlayback.currentIndex) {
    return true;
  }
  return (
    Math.abs((previousPlayback.playbackPositionMs ?? 0) - (nextPlayback.playbackPositionMs ?? 0)) >=
    thresholdMs
  );
}
