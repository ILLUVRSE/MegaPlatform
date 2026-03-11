import type { DifficultyProfile, GoalieDifficulty, ShotSpawn, ShotType } from './types';

const DIFFICULTY_PROFILES: Record<GoalieDifficulty, DifficultyProfile> = {
  easy: {
    speedMin: 360,
    speedMax: 560,
    curveChance: 0.15,
    oneTimerChance: 0.08,
    spawnMsMin: 760,
    spawnMsMax: 1150
  },
  medium: {
    speedMin: 470,
    speedMax: 700,
    curveChance: 0.24,
    oneTimerChance: 0.14,
    spawnMsMin: 620,
    spawnMsMax: 940
  },
  hard: {
    speedMin: 580,
    speedMax: 880,
    curveChance: 0.33,
    oneTimerChance: 0.24,
    spawnMsMin: 500,
    spawnMsMax: 820
  }
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function laneFromRoll(roll: number): -1 | 0 | 1 {
  if (roll < 0.3334) return -1;
  if (roll > 0.6666) return 1;
  return 0;
}

function shotTypeFromRoll(curveRoll: number, oneTimerRoll: number, profile: DifficultyProfile): ShotType {
  if (oneTimerRoll < profile.oneTimerChance) return 'one_timer';
  if (curveRoll < profile.curveChance) return 'curve';
  return 'straight';
}

export function getDifficultyProfile(difficulty: GoalieDifficulty, wave: number, assist: boolean): DifficultyProfile {
  const base = DIFFICULTY_PROFILES[difficulty];
  const waveBoost = Math.max(0, wave - 1) * 26;
  const assistScale = assist ? 0.94 : 1;

  return {
    speedMin: (base.speedMin + waveBoost) * assistScale,
    speedMax: (base.speedMax + waveBoost * 1.12) * assistScale,
    curveChance: clamp(base.curveChance + wave * 0.005, 0, 0.56),
    oneTimerChance: clamp(base.oneTimerChance + wave * 0.004, 0, 0.48),
    spawnMsMin: Math.max(240, base.spawnMsMin - wave * 8),
    spawnMsMax: Math.max(360, base.spawnMsMax - wave * 9)
  };
}

export function createShotSpawn(
  difficulty: GoalieDifficulty,
  wave: number,
  warmupShotsRemaining: number,
  assist: boolean,
  rng: () => number
): ShotSpawn {
  const profile = getDifficultyProfile(difficulty, wave, assist);
  const warmupScale = warmupShotsRemaining > 0 ? 0.82 : 1;
  const speedMin = profile.speedMin * warmupScale;
  const speedMax = profile.speedMax * warmupScale;

  return {
    lane: laneFromRoll(rng()),
    speed: speedMin + (speedMax - speedMin) * rng(),
    type: shotTypeFromRoll(rng(), rng(), profile),
    delayMs: Math.round(profile.spawnMsMin + (profile.spawnMsMax - profile.spawnMsMin) * rng())
  };
}

export function computeVarietyScore(profile: DifficultyProfile): number {
  return profile.curveChance * 0.55 + profile.oneTimerChance * 0.45;
}
