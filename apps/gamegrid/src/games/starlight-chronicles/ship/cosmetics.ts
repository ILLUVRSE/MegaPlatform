import cosmeticsRaw from '../../../content/starlight-chronicles/cosmetics.json';
import type { FactionId, StarlightProfile } from '../rules';
import type { HullCatalog } from './hulls';

export interface CosmeticUnlockRule {
  type: 'starter' | 'rank' | 'faction' | 'weekly-report' | 'contracts';
  rank?: number;
  faction?: FactionId;
  standing?: number;
  weeksSeen?: number;
  contractsCompleted?: number;
}

export interface CosmeticItem {
  id: string;
  name: string;
  unlock: CosmeticUnlockRule;
  color?: number;
  symbol?: string;
}

export interface CosmeticsCatalog {
  skins: CosmeticItem[];
  decals: CosmeticItem[];
  trails: CosmeticItem[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

export function loadCosmeticsCatalog(): CosmeticsCatalog {
  const parsed = cosmeticsRaw as unknown as CosmeticsCatalog;
  if (!parsed || !Array.isArray(parsed.skins) || !Array.isArray(parsed.decals) || !Array.isArray(parsed.trails)) {
    throw new Error('starlight cosmetics malformed');
  }
  return parsed;
}

function seenWeeks(profile: StarlightProfile): number {
  if (!profile.lastSeenGalacticReportWeekKey) return 0;
  return Math.max(1, profile.runCount > 0 ? Math.floor(profile.runCount / 2) : 1);
}

export function isCosmeticUnlocked(profile: StarlightProfile, cosmetic: CosmeticItem): boolean {
  const unlock = cosmetic.unlock;
  if (unlock.type === 'starter') return true;
  if (unlock.type === 'rank') return profile.captainRank >= (unlock.rank ?? 1);
  if (unlock.type === 'faction') {
    const faction = unlock.faction ?? 'concordium';
    return profile.factions[faction] >= (unlock.standing ?? 0);
  }
  if (unlock.type === 'weekly-report') return seenWeeks(profile) >= (unlock.weeksSeen ?? 1);
  if (unlock.type === 'contracts') return profile.contractsCompleted >= (unlock.contractsCompleted ?? 1);
  return false;
}

export function applyHullCosmetic(
  profile: StarlightProfile,
  hullId: string,
  type: 'skinKey' | 'decalKey' | 'trailKey',
  value: string,
  catalog: CosmeticsCatalog
): StarlightProfile {
  const source = type === 'skinKey' ? catalog.skins : type === 'decalKey' ? catalog.decals : catalog.trails;
  const cosmetic = source.find((entry) => entry.id === value);
  if (!cosmetic || !isCosmeticUnlocked(profile, cosmetic)) return profile;

  return {
    ...profile,
    hullCosmetics: {
      ...profile.hullCosmetics,
      [hullId]: {
        ...(profile.hullCosmetics[hullId] ?? { skinKey: 'navy-band', decalKey: 'none', trailKey: 'none' }),
        [type]: value
      }
    }
  };
}

export function ensureCosmetics(profile: StarlightProfile, hulls: HullCatalog, catalog: CosmeticsCatalog): StarlightProfile {
  const next = { ...profile.hullCosmetics };
  for (let i = 0; i < hulls.hulls.length; i += 1) {
    const hull = hulls.hulls[i];
    next[hull.id] = next[hull.id] ?? { skinKey: hull.visuals.skinKey, decalKey: 'none', trailKey: 'none' };

    if (!catalog.skins.some((entry) => entry.id === next[hull.id].skinKey)) next[hull.id].skinKey = hull.visuals.skinKey;
    if (!catalog.decals.some((entry) => entry.id === next[hull.id].decalKey)) next[hull.id].decalKey = 'none';
    if (!catalog.trails.some((entry) => entry.id === next[hull.id].trailKey)) next[hull.id].trailKey = 'none';
  }
  return {
    ...profile,
    hullCosmetics: next
  };
}

export function recommendedHullClassesForFocus(focus: 'diplomacy' | 'profit' | 'wonder' | 'combat'): string[] {
  if (focus === 'profit') return ['Freighter', 'Frigate'];
  if (focus === 'wonder') return ['Science Vessel', 'Scout'];
  if (focus === 'combat') return ['Gunship', 'Interceptor'];
  return ['Frigate', 'Science Vessel'];
}

export function readShareLabels(profile: StarlightProfile, hullName: string, hullClass: string, stats: { hp: number; dps: number; scan: number; cargo: number }): string[] {
  return [
    `${hullName} (${hullClass})`,
    `HP ${Math.round(stats.hp)}`,
    `DPS ${Math.round(stats.dps)}`,
    `Scan ${stats.scan.toFixed(2)}`,
    `Cargo ${stats.cargo}`,
    `Standings C${profile.factions.concordium} F${profile.factions.freebelt} A${profile.factions.astral}`
  ];
}

export function cosmeticRecordIsValid(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return typeof value.skinKey === 'string' && typeof value.decalKey === 'string' && typeof value.trailKey === 'string';
}
