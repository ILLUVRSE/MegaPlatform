import wingmenRaw from '../../../content/starlight-chronicles/wingmen.json';
import { createSeededRng, hashStringToSeed } from '../rng';
import type { FactionId, StarlightProfile } from '../rules';

export interface Wingman {
  id: string;
  name: string;
  factionAffinity: FactionId;
  role: 'Fighter' | 'Support' | 'Interceptor';
  rarity: 'common' | 'uncommon' | 'rare';
  passive: string;
  behavior: {
    targeting: string;
    aggression: number;
  };
}

export interface WingmanCatalog {
  wingmen: Wingman[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

export function loadWingmen(): WingmanCatalog {
  const parsed = wingmenRaw as unknown as WingmanCatalog;
  if (!parsed || !Array.isArray(parsed.wingmen) || parsed.wingmen.length < 12) {
    throw new Error('starlight wingmen content invalid');
  }
  for (let i = 0; i < parsed.wingmen.length; i += 1) {
    const entry = parsed.wingmen[i] as unknown;
    if (!isRecord(entry) || typeof entry.id !== 'string' || typeof entry.name !== 'string' || !isRecord(entry.behavior)) {
      throw new Error('starlight wingman malformed');
    }
  }
  return parsed;
}

export function generateWingmanOffers(catalog: WingmanCatalog, profile: StarlightProfile, systemId: string, dayKey: string, count = 2): Wingman[] {
  const rng = createSeededRng((profile.seedBase ^ hashStringToSeed(`wingman:${systemId}:${dayKey}`)) >>> 0);
  const pool = catalog.wingmen.filter((entry) => !profile.ownedWingmenIds.includes(entry.id));
  const offers: Wingman[] = [];
  const used = new Set<number>();
  const target = Math.min(count, pool.length);
  while (offers.length < target && used.size < pool.length) {
    const idx = Math.max(0, Math.min(pool.length - 1, rng.nextInt(0, pool.length - 1)));
    if (used.has(idx)) continue;
    used.add(idx);
    offers.push(pool[idx]);
  }
  return offers;
}

export function assignActiveWingmen(profile: StarlightProfile, wingmanIds: string[]): StarlightProfile {
  const filtered = wingmanIds.filter((id, idx) => profile.ownedWingmenIds.includes(id) && wingmanIds.indexOf(id) === idx).slice(0, 2);
  return {
    ...profile,
    activeWingmenIds: filtered
  };
}

export function recruitWingman(profile: StarlightProfile, wingmanId: string): StarlightProfile {
  if (profile.ownedWingmenIds.includes(wingmanId)) return profile;
  return {
    ...profile,
    ownedWingmenIds: [...profile.ownedWingmenIds, wingmanId]
  };
}

export function wingmanRiskReduction(profile: StarlightProfile): number {
  let reduction = 0;
  for (let i = 0; i < profile.activeWingmenIds.length; i += 1) {
    const id = profile.activeWingmenIds[i];
    if (id.includes('sable') || id.includes('brink')) reduction += 0.03;
    if (id.includes('nova')) reduction += 0.02;
  }
  return Math.min(0.1, reduction);
}

export function wingmanEscortBonus(profile: StarlightProfile): number {
  return Math.min(10, profile.activeWingmenIds.length * 3);
}
