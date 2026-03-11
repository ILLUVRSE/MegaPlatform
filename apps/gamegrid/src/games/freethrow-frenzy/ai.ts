import { DIFFICULTY_PRESETS } from './config/tuning';
import { mapInputToShotArc, resolveShotOutcome } from './shotModel';
import { SHOT_SPOTS, TIMED_SPOT_ORDER, type FreethrowDifficulty, type FreethrowMode, type ShotEvaluationContext, type ShotInput, type ShotOutcome, type ShotSpotId } from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function varianceForDifficulty(difficulty: FreethrowDifficulty): { aim: number; power: number; timingSpread: number } {
  const preset = DIFFICULTY_PRESETS[difficulty];
  return {
    aim: preset.aimVariance,
    power: preset.powerVariance,
    timingSpread: clamp(0.12 + preset.aimVariance, 0.1, 0.5)
  };
}

function nextSeed(seed: number): number {
  return (seed * 1664525 + 1013904223) % 4294967296;
}

export interface FreethrowAiState {
  seed: number;
}

export type FreethrowAiPersonality = 'balanced' | 'clutch' | 'streaky' | 'conservative';

export interface PlannedAiShot {
  state: FreethrowAiState;
  spotId: ShotSpotId;
  input: ShotInput;
}

export function createFreethrowAiState(seed = 0.271828): FreethrowAiState {
  return { seed };
}

export function nextAiRandom(state: FreethrowAiState): { state: FreethrowAiState; value: number } {
  const seed = nextSeed(state.seed);
  return { state: { seed }, value: seed / 4294967296 };
}

export function pickAiHorseSpot(difficulty: FreethrowDifficulty, random: number): ShotSpotId {
  if (difficulty === 'easy') return random < 0.55 ? 'free_throw' : random < 0.85 ? 'midrange' : 'three_point';
  if (difficulty === 'pro') return random < 0.12 ? 'free_throw' : random < 0.42 ? 'midrange' : 'three_point';
  if (difficulty === 'hard') return random < 0.2 ? 'free_throw' : random < 0.5 ? 'midrange' : 'three_point';
  return random < 0.35 ? 'free_throw' : random < 0.7 ? 'midrange' : 'three_point';
}

export function pickAiSpotForMode(mode: FreethrowMode, difficulty: FreethrowDifficulty, random: number): ShotSpotId {
  if (mode === 'timed_60') {
    if (difficulty === 'easy') return random < 0.6 ? 'free_throw' : random < 0.9 ? 'midrange' : 'three_point';
    if (difficulty === 'pro') return random < 0.12 ? 'free_throw' : random < 0.4 ? 'midrange' : 'three_point';
    if (difficulty === 'hard') return random < 0.2 ? 'free_throw' : random < 0.5 ? 'midrange' : 'three_point';
    return random < 0.35 ? 'free_throw' : random < 0.72 ? 'midrange' : 'three_point';
  }

  return TIMED_SPOT_ORDER[Math.floor(random * TIMED_SPOT_ORDER.length) % TIMED_SPOT_ORDER.length];
}

export function buildAdaptiveAiDifficulty(
  base: FreethrowDifficulty,
  personality: FreethrowAiPersonality,
  playerScoreDelta: number,
  playerAccuracy: number
): FreethrowDifficulty {
  let tier = base === 'easy' ? 0 : base === 'medium' ? 1 : base === 'hard' ? 2 : 3;
  const pressureBoost = playerScoreDelta >= 7 || playerAccuracy >= 0.72 ? 1 : 0;
  const reliefDrop = playerScoreDelta <= -8 || playerAccuracy <= 0.36 ? -1 : 0;

  if (personality === 'clutch') tier += pressureBoost;
  if (personality === 'conservative') tier += reliefDrop;
  if (personality === 'balanced') tier += pressureBoost + reliefDrop;
  if (personality === 'streaky') {
    const swing = playerScoreDelta >= 6 ? 1 : playerScoreDelta <= -6 ? -1 : 0;
    tier += swing;
  }

  if (tier <= 0) return 'easy';
  if (tier === 1) return 'medium';
  if (tier === 2) return 'hard';
  return 'pro';
}

function personalityNudge(personality: FreethrowAiPersonality): { aim: number; power: number; timing: number } {
  switch (personality) {
    case 'clutch':
      return { aim: 0.85, power: 0.9, timing: 0.82 };
    case 'streaky':
      return { aim: 1.08, power: 1.05, timing: 1.06 };
    case 'conservative':
      return { aim: 0.92, power: 0.95, timing: 0.96 };
    default:
      return { aim: 1, power: 1, timing: 1 };
  }
}

export function planAiShot(
  state: FreethrowAiState,
  spotId: ShotSpotId,
  difficulty: FreethrowDifficulty,
  controls: ShotInput['controlScheme'],
  timingMeter: boolean,
  personality: FreethrowAiPersonality = 'balanced'
): PlannedAiShot {
  const a = nextAiRandom(state);
  const b = nextAiRandom(a.state);
  const c = nextAiRandom(b.state);
  const d = nextAiRandom(c.state);

  const spread = varianceForDifficulty(difficulty);
  const spot = SHOT_SPOTS[spotId];

  const nudge = personalityNudge(personality);
  const aim = clamp((a.value - 0.5) * 2 * spread.aim * nudge.aim, -1, 1);
  const power = clamp(spot.targetPower + (b.value - 0.5) * 2 * spread.power * nudge.power, 0.08, 1);
  const meterPhase = timingMeter ? clamp(0.5 + (c.value - 0.5) * spread.timingSpread * nudge.timing, 0.04, 0.96) : 0.5;

  return {
    state: d.state,
    spotId,
    input: {
      aim,
      power,
      meterPhase,
      controlScheme: controls
    }
  };
}

export function runAiShot(
  planned: PlannedAiShot,
  context: ShotEvaluationContext,
  randA: number,
  randB: number
): { arc: ReturnType<typeof mapInputToShotArc>; outcome: ShotOutcome } {
  const arc = mapInputToShotArc(planned.input, context);
  const outcome = resolveShotOutcome(arc, context, randA, randB);
  return { arc, outcome };
}
