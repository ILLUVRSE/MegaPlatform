import type { HookedFish, RarityTier } from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hash32(input: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

export interface JumpPlan {
  enabled: boolean;
  triggerSec: number;
  durationSec: number;
  arcHeightPx: number;
  splashSeed: number;
}

export interface JumpMomentState {
  active: boolean;
  yOffsetPx: number;
  tNorm: number;
  splashSeed: number;
  shakeSuggested: boolean;
  justStarted: boolean;
}

export function isJumpEligible(rarityTier: RarityTier, weightLb: number, p95WeightLb: number): boolean {
  return rarityTier === 'Rare' || rarityTier === 'Legendary' || weightLb >= p95WeightLb;
}

export function planJumpMoment(seed: number, eventId: number, rarityTier: RarityTier, weightLb: number, p95WeightLb: number): JumpPlan {
  if (!isJumpEligible(rarityTier, weightLb, p95WeightLb)) {
    return { enabled: false, triggerSec: 0, durationSec: 0, arcHeightPx: 0, splashSeed: seed ^ eventId };
  }
  const h = hash32(`${seed}:${eventId}:${rarityTier}:${Math.round(weightLb * 100)}`);
  const triggerSec = 0.85 + ((h & 1023) / 1023) * 1.4;
  const durationSec = 0.36 + (((h >>> 10) & 255) / 255) * 0.2;
  const arcHeightPx = 22 + (((h >>> 18) & 255) / 255) * 28;
  return {
    enabled: true,
    triggerSec,
    durationSec,
    arcHeightPx,
    splashSeed: h
  };
}

export class JumpMomentController {
  private plan: JumpPlan = { enabled: false, triggerSec: 0, durationSec: 0, arcHeightPx: 0, splashSeed: 0 };
  private elapsedSec = 0;
  private state: JumpMomentState = {
    active: false,
    yOffsetPx: 0,
    tNorm: 0,
    splashSeed: 0,
    shakeSuggested: false,
    justStarted: false
  };

  reset(): void {
    this.plan.enabled = false;
    this.elapsedSec = 0;
    this.state.active = false;
    this.state.yOffsetPx = 0;
    this.state.tNorm = 0;
    this.state.shakeSuggested = false;
    this.state.justStarted = false;
  }

  arm(plan: JumpPlan): void {
    this.plan = plan;
    this.elapsedSec = 0;
    this.state.active = false;
    this.state.yOffsetPx = 0;
    this.state.tNorm = 0;
    this.state.shakeSuggested = false;
    this.state.justStarted = false;
    this.state.splashSeed = plan.splashSeed;
  }

  update(dtSec: number, reducedMotion: boolean, allowHeavyMotion: boolean): JumpMomentState {
    this.state.justStarted = false;
    if (!this.plan.enabled || !allowHeavyMotion) {
      this.state.active = false;
      this.state.yOffsetPx = 0;
      this.state.tNorm = 0;
      this.state.shakeSuggested = false;
      return this.state;
    }

    this.elapsedSec += clamp(dtSec, 0, 0.05);
    if (this.elapsedSec < this.plan.triggerSec) {
      this.state.active = false;
      this.state.yOffsetPx = 0;
      this.state.tNorm = 0;
      this.state.shakeSuggested = false;
      return this.state;
    }

    const local = this.elapsedSec - this.plan.triggerSec;
    if (local > this.plan.durationSec) {
      this.state.active = false;
      this.state.yOffsetPx = 0;
      this.state.tNorm = 1;
      this.state.shakeSuggested = false;
      return this.state;
    }

    const t = clamp(local / this.plan.durationSec, 0, 1);
    const parabola = 1 - Math.pow(2 * t - 1, 2);
    this.state.justStarted = !this.state.active;
    this.state.active = true;
    this.state.tNorm = t;
    this.state.yOffsetPx = parabola * this.plan.arcHeightPx;
    this.state.shakeSuggested = !reducedMotion && t < 0.15;
    return this.state;
  }
}

export function deriveP95Weight(hooked: HookedFish): number {
  return hooked.fish.minWeightLb + (hooked.fish.maxWeightLb - hooked.fish.minWeightLb) * 0.95;
}
