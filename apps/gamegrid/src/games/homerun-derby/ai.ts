import { resolveContact } from './physics/contact';
import { simulateFlight } from './physics/flight';
import type { AimLane, AIDifficultyProfile, BatterSwing, HomerunDifficulty, PitchDefinition } from './types';
import type { HomerunTuning } from './config/tuning';
import { clamp } from './config/tuning';

function profileForDifficulty(difficulty: HomerunDifficulty): AIDifficultyProfile {
  if (difficulty === 'easy') {
    return {
      timingJitterMs: 78,
      missChance: 0.22,
      laneMistakeChance: 0.35,
      powerBias: -0.14
    };
  }

  if (difficulty === 'hard') {
    return {
      timingJitterMs: 32,
      missChance: 0.08,
      laneMistakeChance: 0.14,
      powerBias: 0.1
    };
  }

  if (difficulty === 'pro') {
    return {
      timingJitterMs: 22,
      missChance: 0.05,
      laneMistakeChance: 0.1,
      powerBias: 0.16
    };
  }

  return {
    timingJitterMs: 48,
    missChance: 0.13,
    laneMistakeChance: 0.22,
    powerBias: 0
  };
}

function nearestLane(value: number): AimLane {
  if (value < -0.33) return -1;
  if (value > 0.33) return 1;
  return 0;
}

export function simulateAiSwing(
  pitch: PitchDefinition,
  difficulty: HomerunDifficulty,
  pitchLane: AimLane,
  randomA: number,
  randomB: number,
  randomC: number,
  tuning: HomerunTuning
): BatterSwing {
  const profile = profileForDifficulty(difficulty);
  const typeMissBoost = pitch.type === 'splitter' ? 0.08 : pitch.type === 'changeup' ? 0.05 : pitch.type === 'curveball' ? 0.03 : 0;
  const missChance = clamp(profile.missChance + typeMissBoost - (difficulty === 'pro' ? 0.02 : 0), 0.02, 0.4);
  const shouldMiss = randomA < missChance;

  const laneMistakeBoost = pitch.type === 'curveball' || pitch.type === 'slider' ? 0.06 : pitch.type === 'splitter' ? 0.04 : 0;
  const laneMistakeChance = clamp(profile.laneMistakeChance + laneMistakeBoost - (difficulty === 'pro' ? 0.04 : 0), 0.05, 0.5);
  const laneNoise = randomB < laneMistakeChance ? (randomC < 0.5 ? -1 : 1) : 0;
  const aimLane = nearestLane(clamp(pitchLane + laneNoise, -1, 1));

  const typeTimingBias =
    pitch.type === 'changeup' ? -18 : pitch.type === 'splitter' ? -12 : pitch.type === 'fastball' ? 6 : 0;
  const timingCenter = shouldMiss ? 140 : profile.powerBias * 24 + typeTimingBias;
  const timingDeltaMs = (randomA - 0.5) * profile.timingJitterMs * 2 + timingCenter;

  const planeBias = pitch.type === 'splitter' ? -0.2 : pitch.type === 'changeup' ? -0.1 : 0;
  const swingPlane = clamp(pitch.verticalPlane + (randomB - 0.5) * 0.6 + planeBias, -1, 1);

  const contact = resolveContact(timingDeltaMs, pitch, difficulty, aimLane, pitchLane, swingPlane, false, tuning);
  const flight = simulateFlight(contact, randomC, tuning);

  return {
    contact,
    flight
  };
}
