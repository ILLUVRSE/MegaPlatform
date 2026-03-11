import { describe, expect, it } from 'vitest';
import { createInitialProfile } from '../rules';
import { generateRecruitmentPool, generateStartingCrew } from './crewGen';
import { assignCrew, gainCrewXp, resolveCrewBonuses, unlockedPerks } from './crewRules';
import { deriveShipStats } from '../economy/fitting';
import { loadItemsCatalog } from '../economy/inventory';

describe('starlight crew system', () => {
  it('generates deterministic starting crew and recruitment pool', () => {
    const a = generateStartingCrew(12345);
    const b = generateStartingCrew(12345);
    expect(a).toEqual(b);

    const recruitsA = generateRecruitmentPool({ runSeed: 9001, nodeId: 'n-1-2', standingBias: 'freebelt', captainRank: 3 }, 3);
    const recruitsB = generateRecruitmentPool({ runSeed: 9001, nodeId: 'n-1-2', standingBias: 'freebelt', captainRank: 3 }, 3);
    expect(recruitsA).toEqual(recruitsB);
  });

  it('assigning crew updates derived ship bonuses', () => {
    const items = loadItemsCatalog();
    let profile = createInitialProfile(10);
    const baseline = deriveShipStats(profile, items.modules);

    const recruit = generateRecruitmentPool({ runSeed: 22, nodeId: 'shop-1', standingBias: 'concordium', captainRank: 4 }, 1)[0];
    profile = {
      ...profile,
      crew: {
        ...profile.crew,
        roster: [...profile.crew.roster, recruit]
      }
    };

    profile = {
      ...profile,
      crew: assignCrew(profile.crew, recruit.role, recruit.id)
    };

    const withCrew = deriveShipStats(profile, items.modules);
    expect(withCrew.diplomacyBonus + withCrew.scanBonus + withCrew.repairEfficiency + withCrew.combatBonus).toBeGreaterThan(
      baseline.diplomacyBonus + baseline.scanBonus + baseline.repairEfficiency + baseline.combatBonus
    );
  });

  it('unlocks perks at levels 2, 4, and 6', () => {
    const member = generateStartingCrew(999).roster[0];
    expect(unlockedPerks(member)).toHaveLength(0);

    const level2 = gainCrewXp(member, 70);
    expect(level2.level).toBeGreaterThanOrEqual(2);
    expect(unlockedPerks(level2).length).toBe(1);

    const level4 = gainCrewXp(member, 500);
    expect(level4.level).toBeGreaterThanOrEqual(4);
    expect(unlockedPerks(level4).length).toBeGreaterThanOrEqual(2);

    const level6 = gainCrewXp(member, 2000);
    expect(level6.level).toBe(6);
    expect(unlockedPerks(level6)).toHaveLength(3);
  });

  it('resolves aggregate crew bonuses from active stations only', () => {
    const crew = generateStartingCrew(42);
    const full = resolveCrewBonuses(crew);

    const unassigned = {
      ...crew,
      active: {
        captain: null,
        science: null,
        engineer: null,
        tactical: null
      }
    };

    const none = resolveCrewBonuses(unassigned);
    expect(full.diplomacyBonus + full.scanBonus + full.repairEfficiency + full.combatBonus).toBeGreaterThan(0);
    expect(none).toEqual({ diplomacyBonus: 0, scanBonus: 0, repairEfficiency: 0, combatBonus: 0 });
  });
});
