import type { AimLane, ContactResult, HomerunDifficulty, PitchDefinition } from '../types';
import type { HomerunTuning } from '../config/tuning';
import { getTimingWindows, resolveTimingTier } from './contact';
import type { SwipeMetrics } from '../input/SwipeSwingController';
import { GAME_CONFIG } from '../config/gameConfig';
import { clamp } from '../config/tuning';

export type ContactGrade = 'Perfect' | 'Good' | 'Early' | 'Late' | 'Foul' | 'Miss';

export interface ResolvedSwipeContact {
  contact: ContactResult;
  grade: ContactResult['grade'];
}

function laneAlignment(aim: AimLane, pitchLane: AimLane): number {
  const diff = Math.abs(aim - pitchLane);
  if (diff === 0) return 1;
  if (diff === 1) return 0.74;
  return 0.46;
}

function sweetSpotScore(offsetPx: number): number {
  const cfg = GAME_CONFIG.contact;
  if (offsetPx <= cfg.perfectSweetSpotRadiusPx) return 1;
  if (offsetPx >= cfg.sweetSpotRadiusPx) return 0;
  return 1 - (offsetPx - cfg.perfectSweetSpotRadiusPx) / Math.max(1, cfg.sweetSpotRadiusPx - cfg.perfectSweetSpotRadiusPx);
}

function sprayAngleFromSwipe(swipe: SwipeMetrics): number {
  const horizontal = clamp(Math.cos(swipe.angleRad), -1, 1);
  return horizontal * 21;
}

export function resolveSwipeContact(
  timingDeltaMs: number,
  pitch: PitchDefinition,
  difficulty: HomerunDifficulty,
  pitchLane: AimLane,
  swipe: SwipeMetrics,
  contactOffsetPx: number,
  timingAssist: boolean,
  tuning: HomerunTuning,
  randomUnit: number
): ResolvedSwipeContact {
  const windows = getTimingWindows(difficulty, timingAssist, tuning);
  const timing = resolveTimingTier(timingDeltaMs, windows);

  if (timing === 'miss') {
    return {
      grade: 'Miss',
      contact: {
        timing,
        quality: 'miss',
        grade: 'Miss',
        exitVelocityMph: 0,
        launchAngleDeg: 0,
        sprayLane: swipe.aimLane,
        sprayAngleDeg: 0,
        perfectPerfect: false,
        strike: true,
        aimError: 1,
        timingDeltaMs
      }
    };
  }

  const lane = laneAlignment(swipe.aimLane, pitchLane);
  const timingScore = timing === 'perfect' ? 1 : 0.72;
  const sweetSpot = sweetSpotScore(contactOffsetPx);
  const speedScore = swipe.quality;
  const planeScore = 1 - Math.min(1, Math.abs(swipe.swingPlane - pitch.verticalPlane) * 0.6);

  const contactScore = clamp((timingScore * 0.38) + (lane * 0.2) + (speedScore * 0.22) + (sweetSpot * 0.15) + (planeScore * 0.05), 0, 1);
  const tinyNoise = (randomUnit - 0.5) * GAME_CONFIG.contact.tinyRandomness;

  const rawExit =
    tuning.contact.baseExitVelocity +
    tuning.contact.timingVelocityScale * timingScore +
    tuning.contact.aimVelocityScale * (lane - 0.5) +
    speedScore * 30 +
    sweetSpot * 22;

  const exitVelocityMph = clamp(rawExit * (0.92 + tinyNoise), 25, 124);
  const timingLift = timing === 'early' ? tuning.contact.launchTimingAdjust : timing === 'late' ? -tuning.contact.launchTimingAdjust : 0;
  const launchAngleDeg = clamp(
    tuning.contact.launchBase + timingLift + swipe.swingPlane * tuning.contact.launchPlaneAdjust + (sweetSpot - 0.5) * 10 + speedScore * 9,
    tuning.contact.minLaunch,
    tuning.contact.maxLaunch
  );

  const sprayAngleDeg = clamp(sprayAngleFromSwipe(swipe) + (timing === 'early' ? -6 : timing === 'late' ? 6 : 0), -38, 38);

  let grade: ContactResult['grade'] = 'Good';
  if (Math.abs(sprayAngleDeg) >= GAME_CONFIG.contact.foulSprayThresholdDeg && timing !== 'perfect') {
    grade = 'Foul';
  } else if (timing === 'early') {
    grade = 'Early';
  } else if (timing === 'late') {
    grade = 'Late';
  }

  if (timing === 'perfect' && sweetSpot >= 0.9 && speedScore >= 0.72 && lane >= 0.92) {
    grade = 'Perfect';
  }

  const quality: ContactResult['quality'] = grade === 'Perfect' ? 'perfect' : contactScore >= 0.66 ? 'solid' : 'weak';

  return {
    grade,
    contact: {
      timing,
      quality,
      grade,
      exitVelocityMph,
      launchAngleDeg,
      sprayLane: swipe.aimLane,
      sprayAngleDeg,
      perfectPerfect: grade === 'Perfect' && swipe.aimLane === 0,
      strike: false,
      aimError: clamp(1 - (lane * sweetSpot), 0, 1),
      timingDeltaMs
    }
  };
}
