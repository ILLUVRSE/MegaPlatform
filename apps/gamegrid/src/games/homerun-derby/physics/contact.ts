import type { AimLane, ContactResult, HomerunDifficulty, PitchDefinition, TimingTier, TimingWindows } from '../types';
import type { HomerunTuning } from '../config/tuning';
import { clamp } from '../config/tuning';

export function getTimingWindows(
  difficulty: HomerunDifficulty,
  timingAssist: boolean,
  tuning: HomerunTuning
): TimingWindows {
  let perfectMs = tuning.timing.perfectMs;
  let earlyLateMs = tuning.timing.earlyLateMs;

  if (difficulty === 'easy') {
    perfectMs *= 1.2;
    earlyLateMs *= 1.15;
  } else if (difficulty === 'hard') {
    perfectMs *= 0.82;
    earlyLateMs *= 0.88;
  } else if (difficulty === 'pro') {
    perfectMs *= 0.72;
    earlyLateMs *= 0.8;
  }

  if (timingAssist) {
    perfectMs *= tuning.timing.assistScale;
    earlyLateMs *= tuning.timing.assistScale;
  }

  return {
    perfectMs,
    earlyLateMs
  };
}

export function resolveTimingTier(deltaMs: number, windows: TimingWindows): TimingTier {
  const absolute = Math.abs(deltaMs);
  if (absolute <= windows.perfectMs) return 'perfect';
  if (absolute <= windows.earlyLateMs) return deltaMs < 0 ? 'early' : 'late';
  return 'miss';
}

function laneAlignment(aim: AimLane, pitchLane: AimLane): number {
  const diff = Math.abs(aim - pitchLane);
  if (diff === 0) return 1;
  if (diff === 1) return 0.72;
  return 0.45;
}

function planeAlignment(plane: number, pitchPlane: number): number {
  const diff = Math.abs(plane - pitchPlane);
  return clamp(1 - diff * 0.65, 0.4, 1);
}

function qualityFromTiming(timing: TimingTier): number {
  if (timing === 'perfect') return 1;
  if (timing === 'early' || timing === 'late') return 0.68;
  return 0;
}

export function resolveContact(
  timingDeltaMs: number,
  pitch: PitchDefinition,
  difficulty: HomerunDifficulty,
  aimLane: AimLane,
  pitchLane: AimLane,
  swingPlane: number,
  timingAssist: boolean,
  tuning: HomerunTuning
): ContactResult {
  const windows = getTimingWindows(difficulty, timingAssist, tuning);
  const timing = resolveTimingTier(timingDeltaMs, windows);
  if (timing === 'miss') {
    return {
      timing,
      quality: 'miss',
      grade: 'Miss',
      exitVelocityMph: 0,
      launchAngleDeg: 0,
      sprayLane: aimLane,
      sprayAngleDeg: 0,
      perfectPerfect: false,
      strike: true,
      aimError: 1,
      timingDeltaMs
    };
  }

  const timingScore = qualityFromTiming(timing);
  const alignment = laneAlignment(aimLane, pitchLane);
  const plane = planeAlignment(swingPlane, pitch.verticalPlane);

  const typeFactor =
    pitch.type === 'fastball'
      ? 1.04
      : pitch.type === 'curveball'
        ? 0.96
        : pitch.type === 'splitter'
          ? 0.94
          : pitch.type === 'changeup'
            ? 0.98
            : 1;
  const assistFactor = timingAssist ? 0.94 : 1;

  const baseVelocity =
    tuning.contact.baseExitVelocity +
    tuning.contact.timingVelocityScale * timingScore +
    tuning.contact.aimVelocityScale * (alignment * plane - 0.5);
  const velocity = clamp(baseVelocity * typeFactor * assistFactor, 30, 118);

  const timingAdjust = timing === 'early' ? tuning.contact.launchTimingAdjust : timing === 'late' ? -tuning.contact.launchTimingAdjust : 0;
  const launchAngleDeg = clamp(
    tuning.contact.launchBase +
      timingAdjust +
      (alignment - 0.5) * tuning.contact.launchAimAdjust +
      swingPlane * tuning.contact.launchPlaneAdjust -
      pitch.breakPx * 0.03,
    tuning.contact.minLaunch,
    tuning.contact.maxLaunch
  );

  const aimError = clamp(1 - alignment * plane, 0, 1);

  let quality: ContactResult['quality'] = 'solid';
  if (timing === 'perfect' && alignment >= 0.95 && plane >= 0.9) quality = 'perfect';
  else if (timing !== 'perfect' || alignment < 0.68 || plane < 0.75) quality = 'weak';

  const exitVelocityMph = velocity + (quality === 'perfect' ? tuning.contact.perfectVelocityBoost : 0);

  return {
    timing,
    quality,
    grade:
      quality === 'perfect'
        ? 'Perfect'
        : timing === 'early'
          ? 'Early'
          : timing === 'late'
            ? 'Late'
            : 'Good',
    exitVelocityMph,
    launchAngleDeg,
    sprayLane: aimLane,
    sprayAngleDeg: aimLane * 12 + (timing === 'early' ? -5 : timing === 'late' ? 5 : 0),
    perfectPerfect: quality === 'perfect' && aimLane === 0 && Math.abs(swingPlane) < 0.2,
    strike: false,
    aimError,
    timingDeltaMs
  };
}
