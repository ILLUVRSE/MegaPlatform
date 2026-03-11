import type { BossPhase } from './enemyPatterns';
import type { DerivedShipStats } from '../economy/fitting';

export interface CombatShipState {
  hp: number;
  shield: number;
  shieldRegenPerSec: number;
  maxHp: number;
  maxShield: number;
}

export interface CombatScoreState {
  kills: number;
  combo: number;
  bestCombo: number;
  damageTaken: number;
}

export function createCombatShip(stats: DerivedShipStats): CombatShipState {
  return {
    hp: stats.maxHp,
    shield: stats.maxShield,
    shieldRegenPerSec: stats.shieldRegenPerSec,
    maxHp: stats.maxHp,
    maxShield: stats.maxShield
  };
}

export function applyIncomingDamage(ship: CombatShipState, amount: number, mitigationPct = 0): CombatShipState {
  const incoming = Math.max(0, amount * (1 - Math.max(0, Math.min(0.25, mitigationPct))));
  const shieldHit = Math.min(ship.shield, incoming);
  const remaining = incoming - shieldHit;
  const hp = Math.max(0, ship.hp - remaining);
  return {
    ...ship,
    shield: ship.shield - shieldHit,
    hp
  };
}

export function regenShield(ship: CombatShipState, deltaSec: number): CombatShipState {
  if (ship.shield >= ship.maxShield) return ship;
  return {
    ...ship,
    shield: Math.min(ship.maxShield, ship.shield + ship.shieldRegenPerSec * Math.max(0, deltaSec))
  };
}

export function scoreOnKill(score: CombatScoreState): CombatScoreState {
  const combo = score.combo + 1;
  return {
    ...score,
    kills: score.kills + 1,
    combo,
    bestCombo: Math.max(score.bestCombo, combo)
  };
}

export function scoreOnPlayerHit(score: CombatScoreState, damage: number): CombatScoreState {
  return {
    ...score,
    combo: 0,
    damageTaken: score.damageTaken + Math.max(0, damage)
  };
}

export function computeMissionScore(score: CombatScoreState): number {
  const killScore = score.kills * 100;
  const comboScore = score.bestCombo * 35;
  const safetyBonus = Math.max(0, 300 - Math.round(score.damageTaken * 2));
  return killScore + comboScore + safetyBonus;
}

export function resolveBossPhase(currentHp: number, maxHp: number, phases: BossPhase[]): BossPhase | null {
  if (phases.length === 0 || maxHp <= 0) return null;
  const ratio = Math.max(0, Math.min(1, currentHp / maxHp));
  const ordered = phases.slice().sort((a, b) => b.hpThreshold - a.hpThreshold);
  for (let i = 0; i < ordered.length; i += 1) {
    if (ratio >= ordered[i].hpThreshold) {
      return ordered[i];
    }
  }
  return ordered[ordered.length - 1];
}
