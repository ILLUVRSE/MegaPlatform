import { hashStringToSeed } from '../rng';
import type { CrewAssignments, CrewDerivedBonuses, CrewMember, CrewPerk, CrewRole, CrewState } from './crewTypes';

const XP_LEVEL_STEPS = [0, 65, 150, 280, 460, 700, 1000] as const;

const BASE_ROLE_BONUS: Record<CrewRole, CrewDerivedBonuses> = {
  captain: { diplomacyBonus: 4, scanBonus: 0, repairEfficiency: 0, combatBonus: 0 },
  science: { diplomacyBonus: 0, scanBonus: 4, repairEfficiency: 0, combatBonus: 0 },
  engineer: { diplomacyBonus: 0, scanBonus: 0, repairEfficiency: 4, combatBonus: 0 },
  tactical: { diplomacyBonus: 0, scanBonus: 0, repairEfficiency: 0, combatBonus: 4 }
};

const TRAIT_BONUSES: Record<string, Partial<CrewDerivedBonuses>> = {
  empathetic: { diplomacyBonus: 1.5 },
  strict: { diplomacyBonus: 0.8, combatBonus: 0.5 },
  curious: { scanBonus: 1.5 },
  analytical: { scanBonus: 1.2, repairEfficiency: 0.6 },
  improviser: { repairEfficiency: 1.4 },
  steady: { repairEfficiency: 1.1 },
  aggressive: { combatBonus: 1.6 },
  guardian: { combatBonus: 1.1 },
  optimist: { diplomacyBonus: 0.7 },
  skeptic: { scanBonus: 0.9 }
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sumBonuses(a: CrewDerivedBonuses, b: Partial<CrewDerivedBonuses>): CrewDerivedBonuses {
  return {
    diplomacyBonus: a.diplomacyBonus + (b.diplomacyBonus ?? 0),
    scanBonus: a.scanBonus + (b.scanBonus ?? 0),
    repairEfficiency: a.repairEfficiency + (b.repairEfficiency ?? 0),
    combatBonus: a.combatBonus + (b.combatBonus ?? 0)
  };
}

export function crewLevelForXp(xp: number): number {
  let level = 1;
  for (let i = 1; i < XP_LEVEL_STEPS.length; i += 1) {
    if (xp >= XP_LEVEL_STEPS[i]) level = i + 1;
  }
  return clamp(level, 1, 6);
}

export function gainCrewXp(member: CrewMember, xpDelta: number): CrewMember {
  const xp = Math.max(0, member.xp + Math.max(0, Math.floor(xpDelta)));
  return {
    ...member,
    xp,
    level: crewLevelForXp(xp)
  };
}

export function unlockedPerks(member: CrewMember): CrewPerk[] {
  return member.perks.filter((perk) => member.level >= perk.unlockLevel);
}

export function resolveCrewMemberBonus(member: CrewMember): CrewDerivedBonuses {
  let total: CrewDerivedBonuses = {
    ...BASE_ROLE_BONUS[member.role]
  };

  total = sumBonuses(total, { diplomacyBonus: member.level * 0.35, scanBonus: member.level * 0.35, repairEfficiency: member.level * 0.35, combatBonus: member.level * 0.35 });

  for (let i = 0; i < member.traits.length; i += 1) {
    total = sumBonuses(total, TRAIT_BONUSES[member.traits[i]] ?? {});
  }

  const perks = unlockedPerks(member);
  for (let i = 0; i < perks.length; i += 1) {
    total = sumBonuses(total, perks[i].effects);
  }

  return total;
}

export function resolveCrewBonuses(crew: CrewState): CrewDerivedBonuses {
  const byId = new Map(crew.roster.map((entry) => [entry.id, entry]));
  const activeIds = Object.values(crew.active).filter((entry): entry is string => Boolean(entry));
  let total: CrewDerivedBonuses = { diplomacyBonus: 0, scanBonus: 0, repairEfficiency: 0, combatBonus: 0 };

  for (let i = 0; i < activeIds.length; i += 1) {
    const member = byId.get(activeIds[i]);
    if (!member) continue;
    total = sumBonuses(total, resolveCrewMemberBonus(member));
  }

  return {
    diplomacyBonus: Math.round(total.diplomacyBonus * 10) / 10,
    scanBonus: Math.round(total.scanBonus * 10) / 10,
    repairEfficiency: Math.round(total.repairEfficiency * 10) / 10,
    combatBonus: Math.round(total.combatBonus * 10) / 10
  };
}

export function assignCrew(crew: CrewState, role: CrewRole, crewId: string | null): CrewState {
  if (!crewId) {
    return {
      ...crew,
      active: {
        ...crew.active,
        [role]: null
      }
    };
  }

  const member = crew.roster.find((entry) => entry.id === crewId);
  if (!member || member.role !== role) {
    return crew;
  }

  return {
    ...crew,
    active: {
      ...crew.active,
      [role]: crewId
    }
  };
}

export function ensureCrewConsistency(crew: CrewState): CrewState {
  const roster = crew.roster;
  const validIds = new Set(roster.map((entry) => entry.id));
  const nextActive: CrewAssignments = {
    captain: crew.active.captain && validIds.has(crew.active.captain) ? crew.active.captain : null,
    science: crew.active.science && validIds.has(crew.active.science) ? crew.active.science : null,
    engineer: crew.active.engineer && validIds.has(crew.active.engineer) ? crew.active.engineer : null,
    tactical: crew.active.tactical && validIds.has(crew.active.tactical) ? crew.active.tactical : null
  };

  return {
    roster,
    active: nextActive
  };
}

export function crewChoiceThreshold(runSeed: number, nodeId: string): number {
  return 6 + ((runSeed ^ hashStringToSeed(nodeId)) % 5);
}
