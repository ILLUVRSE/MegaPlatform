import { createSeededRng, hashStringToSeed } from '../rng';
import type { FactionId } from '../rules';
import type { CrewGenerationContext, CrewMember, CrewPerk, CrewRarity, CrewRole, CrewState, CrewTrait } from './crewTypes';

const NAME_PART_A = ['Ari', 'Cor', 'Vela', 'Nyx', 'Mira', 'Tal', 'Kei', 'Rho', 'Sera', 'Jax', 'Tess', 'Orin'];
const NAME_PART_B = ['Nox', 'Vale', 'Quinn', 'Iri', 'Dane', 'Kora', 'Bex', 'Ivar', 'Rune', 'Sol', 'Hale', 'Drift'];

const ROLE_TRAITS: Record<CrewRole, CrewTrait[]> = {
  captain: ['empathetic', 'strict', 'optimist', 'skeptic'],
  science: ['curious', 'analytical', 'skeptic', 'improviser'],
  engineer: ['improviser', 'steady', 'analytical', 'optimist'],
  tactical: ['aggressive', 'guardian', 'strict', 'steady']
};

const ROLE_PERKS: Record<CrewRole, CrewPerk[]> = {
  captain: [
    { id: 'captain-silver-tongue', label: 'Silver Tongue', unlockLevel: 2, effects: { diplomacyBonus: 1.2 } },
    { id: 'captain-calm-bridge', label: 'Calm Bridge', unlockLevel: 4, effects: { diplomacyBonus: 1, repairEfficiency: 0.8 } },
    { id: 'captain-command-aura', label: 'Command Aura', unlockLevel: 6, effects: { diplomacyBonus: 1.6, combatBonus: 0.7 } },
    { id: 'captain-summit-hand', label: 'Summit Hand', unlockLevel: 2, effects: { diplomacyBonus: 1.1, scanBonus: 0.6 } },
    { id: 'captain-civic-line', label: 'Civic Line', unlockLevel: 4, effects: { diplomacyBonus: 1.3 } },
    { id: 'captain-war-room', label: 'War Room', unlockLevel: 6, effects: { diplomacyBonus: 1.1, combatBonus: 1 } }
  ],
  science: [
    { id: 'science-spectrum', label: 'Spectrum Read', unlockLevel: 2, effects: { scanBonus: 1.3 } },
    { id: 'science-probability', label: 'Probability Stack', unlockLevel: 4, effects: { scanBonus: 1.1, diplomacyBonus: 0.5 } },
    { id: 'science-ghost-signals', label: 'Ghost Signals', unlockLevel: 6, effects: { scanBonus: 1.8 } },
    { id: 'science-archive', label: 'Archive Recall', unlockLevel: 2, effects: { scanBonus: 1 } },
    { id: 'science-calibration', label: 'Deep Calibration', unlockLevel: 4, effects: { scanBonus: 1.2, repairEfficiency: 0.7 } },
    { id: 'science-splinter-light', label: 'Splinter Light', unlockLevel: 6, effects: { scanBonus: 1.4, combatBonus: 0.8 } }
  ],
  engineer: [
    { id: 'eng-hotpatch', label: 'Hot Patch', unlockLevel: 2, effects: { repairEfficiency: 1.4 } },
    { id: 'eng-triage', label: 'Triage Routing', unlockLevel: 4, effects: { repairEfficiency: 1.2, combatBonus: 0.5 } },
    { id: 'eng-yard-discipline', label: 'Yard Discipline', unlockLevel: 6, effects: { repairEfficiency: 1.7 } },
    { id: 'eng-jury-rig', label: 'Jury Rig', unlockLevel: 2, effects: { repairEfficiency: 1.1 } },
    { id: 'eng-macro-servos', label: 'Macro Servos', unlockLevel: 4, effects: { repairEfficiency: 1.2, scanBonus: 0.5 } },
    { id: 'eng-pressure-grid', label: 'Pressure Grid', unlockLevel: 6, effects: { repairEfficiency: 1.3, combatBonus: 1 } }
  ],
  tactical: [
    { id: 'tac-killbox', label: 'Killbox Timing', unlockLevel: 2, effects: { combatBonus: 1.3 } },
    { id: 'tac-cover-fire', label: 'Cover Fire', unlockLevel: 4, effects: { combatBonus: 1.1, repairEfficiency: 0.5 } },
    { id: 'tac-zero-lag', label: 'Zero Lag', unlockLevel: 6, effects: { combatBonus: 1.8 } },
    { id: 'tac-intercept', label: 'Intercept Track', unlockLevel: 2, effects: { combatBonus: 1 } },
    { id: 'tac-war-lesson', label: 'War Lesson', unlockLevel: 4, effects: { combatBonus: 1.2, diplomacyBonus: 0.4 } },
    { id: 'tac-hardline', label: 'Hardline Doctrine', unlockLevel: 6, effects: { combatBonus: 1.4, scanBonus: 0.6 } }
  ]
};

function rarityFromRoll(roll: number): CrewRarity {
  if (roll > 0.9) return 'rare';
  if (roll > 0.58) return 'uncommon';
  return 'common';
}

function roleLevelBonus(rarity: CrewRarity): number {
  if (rarity === 'rare') return 2;
  if (rarity === 'uncommon') return 1;
  return 0;
}

function pickTraits(rngSeed: number, role: CrewRole): [CrewTrait, CrewTrait] {
  const rng = createSeededRng(rngSeed);
  const pool = ROLE_TRAITS[role];
  const first = pool[rng.nextInt(0, pool.length - 1)] ?? pool[0];
  let second = pool[rng.nextInt(0, pool.length - 1)] ?? pool[1] ?? pool[0];
  if (first === second) {
    second = pool[(pool.indexOf(first) + 1) % pool.length] ?? second;
  }
  return [first, second];
}

function pickPerks(rngSeed: number, role: CrewRole): [CrewPerk, CrewPerk, CrewPerk] {
  const rng = createSeededRng(rngSeed);
  const pool = ROLE_PERKS[role].slice();
  const chosen: CrewPerk[] = [];
  const unlocks: Array<2 | 4 | 6> = [2, 4, 6];

  for (let i = 0; i < unlocks.length; i += 1) {
    const target = unlocks[i];
    const candidates = pool.filter((entry) => entry.unlockLevel === target);
    const perk = candidates[rng.nextInt(0, candidates.length - 1)] ?? candidates[0];
    if (!perk) continue;
    chosen.push(perk);
  }

  return [chosen[0], chosen[1], chosen[2]];
}

function makeName(seed: number): string {
  const rng = createSeededRng(seed);
  const a = NAME_PART_A[rng.nextInt(0, NAME_PART_A.length - 1)] ?? 'Nova';
  const b = NAME_PART_B[rng.nextInt(0, NAME_PART_B.length - 1)] ?? 'Vale';
  return `${a} ${b}`;
}

function makeCrewMember(seed: number, role: CrewRole, affinity: FactionId, levelFloor: number): CrewMember {
  const rng = createSeededRng(seed);
  const rarity = rarityFromRoll(rng.next());
  const level = Math.max(1, Math.min(6, levelFloor + roleLevelBonus(rarity)));

  return {
    id: `crew-${role}-${seed.toString(16)}`,
    name: makeName(seed ^ 0x5f3759df),
    role,
    traits: pickTraits(seed ^ 0x9e3779b9, role),
    affinity,
    rarity,
    level,
    xp: (level - 1) * 120,
    perks: pickPerks(seed ^ 0x7f4a7c15, role)
  };
}

function standingAffinity(standingBias: FactionId, roll: number): FactionId {
  if (roll < 0.55) return standingBias;
  if (roll < 0.75) return 'concordium';
  if (roll < 0.9) return 'freebelt';
  return 'astral';
}

export function generateStartingCrew(seed: number): CrewState {
  const roles: CrewRole[] = ['captain', 'science', 'engineer', 'tactical'];
  const roster: CrewMember[] = [];
  for (let i = 0; i < roles.length; i += 1) {
    const role = roles[i];
    const memberSeed = (seed ^ hashStringToSeed(`start-${role}-${i}`)) >>> 0;
    const affinity = (['concordium', 'freebelt', 'astral'][i % 3] ?? 'concordium') as FactionId;
    roster.push(makeCrewMember(memberSeed, role, affinity, 1));
  }

  return {
    roster,
    active: {
      captain: roster.find((entry) => entry.role === 'captain')?.id ?? null,
      science: roster.find((entry) => entry.role === 'science')?.id ?? null,
      engineer: roster.find((entry) => entry.role === 'engineer')?.id ?? null,
      tactical: roster.find((entry) => entry.role === 'tactical')?.id ?? null
    }
  };
}

export function generateRecruitmentPool(context: CrewGenerationContext, count = 3): CrewMember[] {
  const seed = (context.runSeed ^ hashStringToSeed(`recruit-${context.nodeId}`)) >>> 0;
  const rng = createSeededRng(seed);
  const roles: CrewRole[] = ['captain', 'science', 'engineer', 'tactical'];
  const recruits: CrewMember[] = [];

  for (let i = 0; i < count; i += 1) {
    const role = roles[rng.nextInt(0, roles.length - 1)] ?? roles[i % roles.length];
    const affinity = standingAffinity(context.standingBias, rng.next());
    const levelFloor = Math.max(1, Math.min(4, Math.floor(context.captainRank / 2) + 1));
    const memberSeed = (seed ^ hashStringToSeed(`${role}-${i}-${Math.floor(rng.next() * 100000)}`)) >>> 0;
    recruits.push(makeCrewMember(memberSeed, role, affinity, levelFloor));
  }

  return recruits;
}

export function addCrewToRoster(state: CrewState, member: CrewMember): CrewState {
  if (state.roster.some((entry) => entry.id === member.id)) return state;
  return {
    ...state,
    roster: [...state.roster, member]
  };
}
