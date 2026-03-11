import goodsRaw from '../../../content/starlight-chronicles/goods.json';
import type { StarlightProfile } from '../rules';

export type GoodLegality = 'legal' | 'contraband';

export interface TradeGood {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  volatility: number;
  legality: GoodLegality;
  size: number;
}

export interface GoodsCatalog {
  goods: TradeGood[];
}

export interface CargoEntry {
  qty: number;
  avgPrice: number;
}

export type CargoManifest = Record<string, CargoEntry>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isGood(value: unknown): value is TradeGood {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.category === 'string' &&
    typeof value.basePrice === 'number' &&
    typeof value.volatility === 'number' &&
    (value.legality === 'legal' || value.legality === 'contraband') &&
    typeof value.size === 'number'
  );
}

export function loadGoodsCatalog(): GoodsCatalog {
  const parsed = goodsRaw as unknown as GoodsCatalog;
  if (!parsed || !Array.isArray(parsed.goods) || !parsed.goods.every(isGood)) {
    throw new Error('starlight goods json malformed');
  }
  if (parsed.goods.length < 18) throw new Error('starlight goods requires at least 18 goods');
  return parsed;
}

export function cargoUsed(manifest: CargoManifest, catalog: GoodsCatalog): number {
  const byId = new Map(catalog.goods.map((entry) => [entry.id, entry]));
  let used = 0;
  for (const [goodId, entry] of Object.entries(manifest)) {
    const def = byId.get(goodId);
    if (!def || entry.qty <= 0) continue;
    used += def.size * entry.qty;
  }
  return used;
}

export function cargoFree(profile: StarlightProfile, catalog: GoodsCatalog): number {
  return Math.max(0, profile.cargoCapacity - cargoUsed(profile.cargo, catalog));
}

export function addCargo(profile: StarlightProfile, catalog: GoodsCatalog, goodId: string, qty: number, priceEach: number): StarlightProfile {
  const good = catalog.goods.find((entry) => entry.id === goodId);
  const safeQty = Math.max(0, Math.floor(qty));
  if (!good || safeQty <= 0) return profile;

  const free = cargoFree(profile, catalog);
  const fit = Math.floor(free / Math.max(1, good.size));
  const buyQty = Math.min(safeQty, fit);
  if (buyQty <= 0) return profile;

  const prev = profile.cargo[goodId] ?? { qty: 0, avgPrice: 0 };
  const nextQty = prev.qty + buyQty;
  const nextAvg = nextQty <= 0 ? 0 : (prev.avgPrice * prev.qty + priceEach * buyQty) / nextQty;

  return {
    ...profile,
    cargo: {
      ...profile.cargo,
      [goodId]: {
        qty: nextQty,
        avgPrice: Math.round(nextAvg)
      }
    },
    inventory: {
      ...profile.inventory,
      credits: Math.max(0, profile.inventory.credits - buyQty * priceEach)
    }
  };
}

export function removeCargo(profile: StarlightProfile, goodId: string, qty: number, salePriceEach: number): StarlightProfile {
  const safeQty = Math.max(0, Math.floor(qty));
  if (safeQty <= 0) return profile;
  const have = profile.cargo[goodId]?.qty ?? 0;
  if (have <= 0) return profile;

  const sold = Math.min(have, safeQty);
  const left = have - sold;
  const nextCargo = { ...profile.cargo };
  if (left <= 0) {
    delete nextCargo[goodId];
  } else {
    nextCargo[goodId] = {
      qty: left,
      avgPrice: profile.cargo[goodId].avgPrice
    };
  }

  return {
    ...profile,
    cargo: nextCargo,
    inventory: {
      ...profile.inventory,
      credits: profile.inventory.credits + sold * salePriceEach
    }
  };
}

export function clearContrabandCargo(profile: StarlightProfile, catalog: GoodsCatalog): { profile: StarlightProfile; confiscatedUnits: number } {
  const contrabandIds = new Set(catalog.goods.filter((entry) => entry.legality === 'contraband').map((entry) => entry.id));
  const nextCargo: CargoManifest = {};
  let confiscatedUnits = 0;

  for (const [goodId, entry] of Object.entries(profile.cargo)) {
    if (contrabandIds.has(goodId)) {
      confiscatedUnits += entry.qty;
      continue;
    }
    nextCargo[goodId] = { ...entry };
  }

  return {
    profile: {
      ...profile,
      cargo: nextCargo
    },
    confiscatedUnits
  };
}
