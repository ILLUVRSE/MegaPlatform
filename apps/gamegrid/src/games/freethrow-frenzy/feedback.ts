import { HEAT_TUNING } from './config/tuning';

export function nextHeatLevel(current: number, made: boolean, swish: boolean): number {
  if (!made) return Math.max(0, current - HEAT_TUNING.missLoss);
  const gain = swish ? HEAT_TUNING.swishGain : HEAT_TUNING.makeGain;
  return Math.min(HEAT_TUNING.maxLevel, current + gain);
}
