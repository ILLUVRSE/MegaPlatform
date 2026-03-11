import type { CatchRecord } from './types';

export interface LakeStats {
  totalFishCaught: number;
  speciesCatchCounts: Record<string, number>;
  speciesWeightTotals: Record<string, number>;
  averageWeightBySpecies: Record<string, number>;
  mostCaughtSpecies: string;
  legendaryCount: number;
  longestFightDurationMs: number;
  highestTensionSurvived: number;
  bestDerbyFinish: number;
}

export function createDefaultLakeStats(): LakeStats {
  return {
    totalFishCaught: 0,
    speciesCatchCounts: {},
    speciesWeightTotals: {},
    averageWeightBySpecies: {},
    mostCaughtSpecies: '-',
    legendaryCount: 0,
    longestFightDurationMs: 0,
    highestTensionSurvived: 0,
    bestDerbyFinish: 999
  };
}

export function updateLakeStatsFromCatch(
  previous: LakeStats,
  catchRecord: CatchRecord,
  fightDurationMs: number,
  tensionPeak: number,
  derbyFinish?: number
): LakeStats {
  const speciesCatchCounts = { ...previous.speciesCatchCounts };
  const speciesWeightTotals = { ...previous.speciesWeightTotals };

  speciesCatchCounts[catchRecord.fishId] = (speciesCatchCounts[catchRecord.fishId] ?? 0) + 1;
  speciesWeightTotals[catchRecord.fishId] = (speciesWeightTotals[catchRecord.fishId] ?? 0) + catchRecord.weightLb;

  const averageWeightBySpecies: Record<string, number> = {};
  let mostCaughtSpecies = '-';
  let mostCaughtCount = -1;

  for (const fishId of Object.keys(speciesCatchCounts)) {
    const count = speciesCatchCounts[fishId];
    const weight = speciesWeightTotals[fishId] ?? 0;
    averageWeightBySpecies[fishId] = count > 0 ? weight / count : 0;
    if (count > mostCaughtCount) {
      mostCaughtCount = count;
      mostCaughtSpecies = fishId;
    }
  }

  return {
    totalFishCaught: previous.totalFishCaught + 1,
    speciesCatchCounts,
    speciesWeightTotals,
    averageWeightBySpecies,
    mostCaughtSpecies,
    legendaryCount: previous.legendaryCount + (catchRecord.rarityTier === 'Legendary' ? 1 : 0),
    longestFightDurationMs: Math.max(previous.longestFightDurationMs, Math.max(0, fightDurationMs)),
    highestTensionSurvived: Math.max(previous.highestTensionSurvived, Math.max(0, tensionPeak)),
    bestDerbyFinish: derbyFinish !== undefined ? Math.min(previous.bestDerbyFinish, derbyFinish) : previous.bestDerbyFinish
  };
}
