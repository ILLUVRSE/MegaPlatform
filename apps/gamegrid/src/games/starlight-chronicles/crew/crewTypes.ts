import type { FactionId } from '../rules';

export type CrewRole = 'captain' | 'science' | 'engineer' | 'tactical';
export type CrewTrait =
  | 'empathetic'
  | 'strict'
  | 'curious'
  | 'analytical'
  | 'improviser'
  | 'steady'
  | 'aggressive'
  | 'guardian'
  | 'optimist'
  | 'skeptic';

export type CrewRarity = 'common' | 'uncommon' | 'rare';

export interface CrewPerk {
  id: string;
  label: string;
  unlockLevel: 2 | 4 | 6;
  effects: Partial<CrewDerivedBonuses>;
}

export interface CrewMember {
  id: string;
  name: string;
  role: CrewRole;
  traits: [CrewTrait, CrewTrait];
  affinity: FactionId;
  rarity: CrewRarity;
  level: number;
  xp: number;
  perks: [CrewPerk, CrewPerk, CrewPerk];
}

export interface CrewAssignments {
  captain: string | null;
  science: string | null;
  engineer: string | null;
  tactical: string | null;
}

export interface CrewState {
  roster: CrewMember[];
  active: CrewAssignments;
}

export interface CrewDerivedBonuses {
  diplomacyBonus: number;
  scanBonus: number;
  repairEfficiency: number;
  combatBonus: number;
}

export interface CrewGenerationContext {
  runSeed: number;
  nodeId: string;
  standingBias: FactionId;
  captainRank: number;
}

export const CREW_ROLES: CrewRole[] = ['captain', 'science', 'engineer', 'tactical'];

export const CREW_ROLE_LABELS: Record<CrewRole, string> = {
  captain: 'Captain',
  science: 'Science Officer',
  engineer: 'Engineer',
  tactical: 'Tactical Officer'
};
