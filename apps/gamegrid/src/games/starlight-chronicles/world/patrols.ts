import { createSeededRng, hashStringToSeed } from '../rng';
import type { FactionId, StarlightProfile } from '../rules';
import type { SecurityTier } from './universe';

export interface PatrolPresence {
  systemId: string;
  weekKey: string;
  faction: FactionId;
  intensity: number;
}

export function patrolPresenceForSystem(profileSeed: number, systemId: string, security: SecurityTier, weekKey: string): PatrolPresence {
  const rng = createSeededRng((profileSeed ^ hashStringToSeed(`patrol:${systemId}:${weekKey}`)) >>> 0);
  const factions: FactionId[] = security === 'SAFE' ? ['concordium', 'concordium', 'astral'] : security === 'LOW' ? ['concordium', 'freebelt', 'astral'] : ['freebelt', 'astral', 'freebelt'];
  const faction = factions[Math.max(0, Math.min(factions.length - 1, rng.nextInt(0, factions.length - 1)))];
  const base = security === 'SAFE' ? 0.7 : security === 'LOW' ? 0.45 : 0.2;
  const intensity = Math.max(0.05, Math.min(0.95, base + (rng.next() - 0.5) * 0.2));
  return {
    systemId,
    weekKey,
    faction,
    intensity
  };
}

export function patrolRiskModifier(patrol: PatrolPresence, choice: 'assist' | 'avoid' | 'ambush'): number {
  if (choice === 'assist') return -0.08 * patrol.intensity;
  if (choice === 'ambush') return 0.1 * patrol.intensity;
  return 0;
}

export function applyPatrolChoice(profile: StarlightProfile, patrol: PatrolPresence, choice: 'assist' | 'avoid' | 'ambush'): StarlightProfile {
  if (choice === 'avoid') return profile;
  const delta = choice === 'assist' ? 1 : -2;
  const credits = choice === 'assist' ? 18 : 32;
  return {
    ...profile,
    factions: {
      ...profile.factions,
      [patrol.faction]: (profile.factions[patrol.faction] ?? 0) + delta
    },
    inventory: {
      ...profile.inventory,
      credits: profile.inventory.credits + credits
    }
  };
}
