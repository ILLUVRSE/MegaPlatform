import { hashStringToSeed } from '../rng';

export type CoopWeaponType = 'pulse' | 'rail' | 'beam' | 'kinetic';

export interface DamageIntentPayload {
  v: number;
  type: 'dmg_intent';
  playerId: string;
  missionId: string;
  t: number;
  amount: number;
  weaponType: CoopWeaponType;
  crit?: boolean;
  checksum: number;
}

export interface SharedBossState {
  missionId: string;
  seed: number;
  scheduleSeed: number;
  maxHp: number;
  hp: number;
  phaseId: number;
  nextAttackId: string;
  lastUpdateMs: number;
  timeline: Array<{ phaseId: number; t: number; hp: number }>;
}

export interface DamageEnvelopeContext {
  elapsedMs: number;
  tacticalBonus: number;
  weaponDamageTier: number;
  damageMultiplier: number;
  recentDamageWindow: number;
}

const PHASE_THRESHOLDS = [0.7, 0.4, 0.15] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizedPhase(hp: number, maxHp: number): number {
  const ratio = maxHp > 0 ? hp / maxHp : 0;
  if (ratio > PHASE_THRESHOLDS[0]) return 1;
  if (ratio > PHASE_THRESHOLDS[1]) return 2;
  if (ratio > PHASE_THRESHOLDS[2]) return 3;
  return 4;
}

export function createSharedBossState(config: {
  missionId: string;
  seed: number;
  scheduleSeed: number;
  bossMaxHp: number;
  nowMs: number;
}): SharedBossState {
  const maxHp = Math.max(1, Math.round(config.bossMaxHp));
  return {
    missionId: config.missionId,
    seed: config.seed,
    scheduleSeed: config.scheduleSeed,
    maxHp,
    hp: maxHp,
    phaseId: 1,
    nextAttackId: deriveAttackId(config.scheduleSeed, config.nowMs, 1),
    lastUpdateMs: config.nowMs,
    timeline: [{ phaseId: 1, t: config.nowMs, hp: maxHp }]
  };
}

export function computeDamageIntentChecksum(seed: number, missionId: string, payload: Pick<DamageIntentPayload, 't' | 'amount' | 'weaponType' | 'crit'>): number {
  const rounded = Math.round(payload.amount * 100);
  return (seed ^ hashStringToSeed(`${missionId}:${payload.t}:${rounded}:${payload.weaponType}:${payload.crit ? 1 : 0}`)) >>> 0;
}

export function validateDamageIntentChecksum(seed: number, payload: DamageIntentPayload): boolean {
  return payload.checksum === computeDamageIntentChecksum(seed, payload.missionId, payload);
}

export function validateDamageIntentEnvelope(payload: DamageIntentPayload, context: DamageEnvelopeContext): { valid: boolean; reason?: string } {
  if (payload.amount <= 0 || payload.amount > 500) return { valid: false, reason: 'intent_amount_out_of_bounds' };
  if (payload.t < 0) return { valid: false, reason: 'intent_time_out_of_bounds' };

  const baseDps = 140 + context.tacticalBonus * 20;
  const damageTierPenalty = Math.max(0, Math.min(3, context.weaponDamageTier)) * 0.1;
  const adjustedDps = baseDps * (1 - damageTierPenalty) * Math.max(0.75, Math.min(1.6, context.damageMultiplier));
  const allowedWindowDamage = adjustedDps * 1.6;

  if (payload.amount > adjustedDps * 0.65) {
    return { valid: false, reason: 'intent_spike_rejected' };
  }

  if (context.recentDamageWindow + payload.amount > allowedWindowDamage) {
    return { valid: false, reason: 'intent_dps_rejected' };
  }

  return { valid: true };
}

export function deriveAttackId(scheduleSeed: number, nowMs: number, phaseId: number, rateScale = 1): string {
  const strideMs = 1300 * Math.max(0.5, Math.min(1.4, rateScale));
  const bucket = Math.floor(Math.max(0, nowMs) / strideMs);
  const pattern = (scheduleSeed + bucket + phaseId * 3) % 6;
  return `atk-${phaseId}-${pattern}`;
}

export function applyDamageIntentToBoss(
  state: SharedBossState,
  payload: DamageIntentPayload,
  nowMs: number,
  effectiveMultiplier = 1
): { state: SharedBossState; appliedDamage: number; phaseChanged: boolean } {
  const mult = Math.max(0.5, Math.min(2.5, effectiveMultiplier));
  const damage = Math.max(0, payload.amount * mult * (payload.crit ? 1.2 : 1));
  const nextHp = clamp(state.hp - damage, 0, state.maxHp);
  const phaseId = normalizedPhase(nextHp, state.maxHp);
  const phaseChanged = phaseId !== state.phaseId;

  const nextState: SharedBossState = {
    ...state,
    hp: nextHp,
    phaseId,
    nextAttackId: deriveAttackId(state.scheduleSeed, nowMs, phaseId),
    lastUpdateMs: nowMs,
    timeline: phaseChanged ? [...state.timeline, { phaseId, t: nowMs, hp: Math.round(nextHp) }] : state.timeline
  };

  return {
    state: nextState,
    appliedDamage: damage,
    phaseChanged
  };
}

export function computeBossStateChecksum(state: Pick<SharedBossState, 'seed' | 'missionId' | 'hp' | 'phaseId' | 'nextAttackId'>): number {
  return (state.seed ^ hashStringToSeed(`${state.missionId}:${Math.round(state.hp)}:${state.phaseId}:${state.nextAttackId}`)) >>> 0;
}

export function reconcileBossHpDisplay(currentHp: number, authoritativeHp: number, dtSec: number, reducedMotion: boolean): number {
  const target = clamp(authoritativeHp, 0, Number.MAX_SAFE_INTEGER);
  if (reducedMotion) return target;
  if (target >= currentHp) return target;
  const maxStep = Math.max(1, dtSec * 180);
  return Math.max(target, currentHp - maxStep);
}

export function scoreContribution(bossDamage: number, survived: boolean, supportCasts: number): number {
  const damageScore = Math.round(Math.max(0, bossDamage));
  const survivalScore = survived ? 120 : 0;
  const supportScore = Math.max(0, supportCasts) * 25;
  return damageScore + survivalScore + supportScore;
}
