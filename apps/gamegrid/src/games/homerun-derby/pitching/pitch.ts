import type { HomerunDifficulty, PitchDefinition, PitchGeneratorState, PitchType } from '../types';
import type { HomerunTuning } from '../config/tuning';
import { clamp } from '../config/tuning';
import { GAME_CONFIG } from '../config/gameConfig';

function nextSeed(seed: number): number {
  return (seed * 1664525 + 1013904223) >>> 0;
}

function nextFloat(seed: number): { seed: number; value: number } {
  const next = nextSeed(seed);
  return {
    seed: next,
    value: next / 0xffffffff
  };
}

function pickPitchType(roll: number, mix: readonly [PitchType, number][]): PitchType {
  let total = 0;
  for (let i = 0; i < mix.length; i += 1) {
    total += mix[i][1];
    if (roll <= total) return mix[i][0];
  }
  return mix[mix.length - 1][0];
}

function mixByDifficulty(difficulty: HomerunDifficulty): readonly [PitchType, number][] {
  return GAME_CONFIG.pitchMixByDifficulty[difficulty];
}

export function getPitchTell(type: PitchType): PitchDefinition['tell'] {
  switch (type) {
    case 'fastball':
      return { label: 'Fastball tell: bright seam flash', color: 0x6fe2ff };
    case 'curveball':
      return { label: 'Curveball tell: looping hand', color: 0xffc861 };
    case 'slider':
      return { label: 'Slider tell: late red tail', color: 0xff7f7f };
    case 'changeup':
      return { label: 'Changeup tell: slow arm fade', color: 0x9bffc1 };
    case 'splitter':
      return { label: 'Splitter tell: sharp drop', color: 0xbfa8ff };
  }
}

function baseBreak(type: PitchType): number {
  if (type === 'curveball') return 1;
  if (type === 'slider') return 0.85;
  if (type === 'changeup') return 0.45;
  if (type === 'splitter') return 0.25;
  return 0.3;
}

function baseVertical(type: PitchType): number {
  if (type === 'curveball') return 1;
  if (type === 'slider') return 0.4;
  if (type === 'changeup') return 1.1;
  if (type === 'splitter') return 1.35;
  return 0.2;
}

function speedBias(type: PitchType): number {
  if (type === 'fastball') return 1.06;
  if (type === 'curveball') return 0.96;
  if (type === 'slider') return 1;
  if (type === 'changeup') return 0.86;
  return 0.9;
}

function tuningForDifficulty(difficulty: HomerunDifficulty, tuning: HomerunTuning) {
  if (difficulty === 'easy') return tuning.pitch.easy;
  if (difficulty === 'hard') return tuning.pitch.hard;
  if (difficulty === 'pro') return tuning.pitch.pro;
  return tuning.pitch.medium;
}

export function createPitchGenerator(seed = 0x13572468): PitchGeneratorState {
  return {
    seed,
    index: 0
  };
}

export function nextPitch(
  state: PitchGeneratorState,
  difficulty: HomerunDifficulty,
  tuning: HomerunTuning
): { state: PitchGeneratorState; pitch: PitchDefinition } {
  const settings = tuningForDifficulty(difficulty, tuning);

  const first = nextFloat(state.seed);
  const second = nextFloat(first.seed);
  const third = nextFloat(second.seed);
  const fourth = nextFloat(third.seed);
  const fifth = nextFloat(fourth.seed);

  const type = pickPitchType(first.value, mixByDifficulty(difficulty));
  const speedSpread = settings.speedMax - settings.speedMin;
  const speedPxPerSec = (settings.speedMin + speedSpread * second.value) * speedBias(type);
  const breakPx = clamp(settings.breakMin + (settings.breakMax - settings.breakMin) * third.value, 8, 128) * baseBreak(type);
  const verticalBreak = clamp(settings.verticalMin + (settings.verticalMax - settings.verticalMin) * fourth.value, -40, 40) * baseVertical(type);
  const windupMs = clamp(settings.windupMin + (settings.windupMax - settings.windupMin) * fifth.value, 420, 1200);
  const intervalMs = clamp(settings.intervalMin + (settings.intervalMax - settings.intervalMin) * third.value, 620, 1800);
  const travelMs = (430 / speedPxPerSec) * 1000;

  return {
    state: {
      seed: fifth.seed,
      index: state.index + 1
    },
    pitch: {
      id: state.index + 1,
      type,
      speedPxPerSec,
      breakPx,
      verticalBreak,
      windupMs,
      intervalMs,
      travelMs,
      tell: getPitchTell(type),
      verticalPlane: clamp(verticalBreak / 40, -1, 1)
    }
  };
}

export function samplePitchPosition(
  pitch: Pick<PitchDefinition, 'type' | 'breakPx' | 'verticalBreak'>,
  progress: number,
  originX: number
): { x: number; y: number } {
  const t = clamp(progress, 0, 1);
  let x = originX;
  if (pitch.type === 'curveball') {
    x = originX + Math.sin(t * Math.PI) * pitch.breakPx * 0.55 - pitch.breakPx * 0.22;
  } else if (pitch.type === 'slider') {
    const lateBreak = t < 0.62 ? 0 : ((t - 0.62) / 0.38) ** 2;
    x = originX + lateBreak * pitch.breakPx * 0.9;
  } else if (pitch.type === 'changeup') {
    const fade = Math.sin(t * Math.PI) * pitch.breakPx * 0.32;
    x = originX + fade;
  } else if (pitch.type === 'splitter') {
    const lateDrop = t < 0.7 ? 0 : ((t - 0.7) / 0.3) ** 2;
    x = originX + lateDrop * pitch.breakPx * 0.4;
  }

  const dropCurve =
    pitch.type === 'splitter'
      ? Math.sin(t * Math.PI) * pitch.verticalBreak * 0.6
      : pitch.type === 'changeup'
        ? Math.sin(t * Math.PI) * pitch.verticalBreak * 0.45
        : Math.sin(t * Math.PI) * pitch.verticalBreak * 0.35;
  const y = 130 + t * 430 + dropCurve;
  return { x, y };
}
