import shocksRaw from '../../../content/starlight-chronicles/market-shocks.json';
import { createSeededRng, hashStringToSeed } from '../rng';
import type { StarlightProfile } from '../rules';
import type { FrontlineState } from '../world/frontline';
import type { UniverseSystem } from '../world/universe';
import { dayKeyUtc, weekKeyUtc } from '../world/time';
import type { GoodsCatalog, TradeGood } from './goods';

export interface MarketShockTemplate {
  id: string;
  name: string;
  targetCategories: string[];
  multiplier: number;
}

export interface MarketShockCatalog {
  shocks: MarketShockTemplate[];
}

export interface PriceContext {
  profileSeed: number;
  dayKey: string;
  weekKey: string;
  system: UniverseSystem;
  good: TradeGood;
  activeShockIds: string[];
  frontline: FrontlineState;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isShock(value: unknown): value is MarketShockTemplate {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string' && typeof value.name === 'string' && Array.isArray(value.targetCategories) && typeof value.multiplier === 'number';
}

export function loadMarketShocks(): MarketShockCatalog {
  const parsed = shocksRaw as unknown as MarketShockCatalog;
  if (!parsed || !Array.isArray(parsed.shocks) || !parsed.shocks.every(isShock)) {
    throw new Error('starlight market shocks malformed');
  }
  if (parsed.shocks.length < 10) throw new Error('starlight market shocks requires >=10 entries');
  return parsed;
}

function normalizeRoll(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const wrapped = value % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

function nextDeterministicIndex(rng: ReturnType<typeof createSeededRng>, size: number): number {
  if (size <= 1) return 0;
  const idx = Math.floor(normalizeRoll(rng.next()) * size);
  return Math.max(0, Math.min(size - 1, idx));
}

function dayNoise(seed: number, dayKey: string, systemId: string, goodId: string, volatility: number): number {
  const rng = createSeededRng((seed ^ hashStringToSeed(`${dayKey}:${systemId}:${goodId}`)) >>> 0);
  const centered = (rng.next() * 2 - 1) * volatility;
  return 1 + centered;
}

export function selectWeeklyShockIds(weekKey: string, seed: number, catalog: MarketShockCatalog, count = 2): string[] {
  const shocks = catalog.shocks.filter(isShock);
  if (shocks.length === 0) return [];
  const rng = createSeededRng((seed ^ hashStringToSeed(`shock:${weekKey}`)) >>> 0);
  const picks: string[] = [];
  const used = new Set<number>();
  const targetCount = Math.max(1, Math.min(count, shocks.length));
  let safety = 0;

  while (picks.length < targetCount && safety < shocks.length * 8) {
    safety += 1;
    const idx = nextDeterministicIndex(rng, shocks.length);
    if (used.has(idx)) continue;
    used.add(idx);
    const shock = shocks[idx];
    if (shock) {
      picks.push(shock.id);
    }
  }

  if (picks.length < targetCount) {
    for (let i = 0; i < shocks.length && picks.length < targetCount; i += 1) {
      if (used.has(i)) continue;
      picks.push(shocks[i].id);
    }
  }

  return picks;
}

export function getMarketShockIdsForNow(seed: number, catalog: MarketShockCatalog, now = new Date()): string[] {
  return selectWeeklyShockIds(weekKeyUtc(now), seed, catalog, 2);
}

export function frontlinePriceModifier(frontline: FrontlineState, systemId: string): number {
  if (!frontline.contestedSystemIds.includes(systemId)) return 1;
  return 1.12;
}

function shockModifier(good: TradeGood, activeShockIds: string[], catalog: MarketShockCatalog): number {
  let mod = 1;
  for (let i = 0; i < catalog.shocks.length; i += 1) {
    const shock = catalog.shocks[i];
    if (!activeShockIds.includes(shock.id)) continue;
    if (shock.targetCategories.includes(good.category)) mod *= shock.multiplier;
  }
  return mod;
}

function legalityModifier(system: UniverseSystem, good: TradeGood): number {
  if (good.legality === 'legal') return 1;
  if (system.security === 'SAFE') return 1.3;
  if (system.security === 'LOW') return 1.12;
  return 0.9;
}

export function computeGoodPrice(context: PriceContext, shockCatalog: MarketShockCatalog): number {
  const base = context.good.basePrice;
  const systemMod = context.system.categoryModifiers[context.good.category] ?? 1;
  const timeMod = dayNoise(context.profileSeed, context.dayKey, context.system.id, context.good.id, context.good.volatility);
  const frontMod = frontlinePriceModifier(context.frontline, context.system.id);
  const weeklyShockMod = shockModifier(context.good, context.activeShockIds, shockCatalog);
  const illegalMod = legalityModifier(context.system, context.good);

  return Math.max(4, Math.round(base * systemMod * timeMod * frontMod * weeklyShockMod * illegalMod));
}

export function computeSystemPrices(
  profile: StarlightProfile,
  system: UniverseSystem,
  goods: GoodsCatalog,
  shockCatalog: MarketShockCatalog,
  frontline: FrontlineState,
  now = new Date()
): Record<string, number> {
  const dayKey = dayKeyUtc(now);
  const weekKey = weekKeyUtc(now);
  const activeShockIds = selectWeeklyShockIds(weekKey, profile.seedBase, shockCatalog, 2);

  const result: Record<string, number> = {};
  for (let i = 0; i < goods.goods.length; i += 1) {
    const good = goods.goods[i];
    result[good.id] = computeGoodPrice(
      {
        profileSeed: profile.seedBase,
        dayKey,
        weekKey,
        system,
        good,
        activeShockIds,
        frontline
      },
      shockCatalog
    );
  }
  return result;
}

export function priceTrend(
  profileSeed: number,
  system: UniverseSystem,
  good: TradeGood,
  shockIds: string[],
  shockCatalog: MarketShockCatalog,
  frontline: FrontlineState,
  day: Date
): 'up' | 'down' | 'flat' {
  const prevDay = new Date(day.getTime() - 24 * 60 * 60 * 1000);
  const a = computeGoodPrice(
    {
      profileSeed,
      dayKey: dayKeyUtc(prevDay),
      weekKey: weekKeyUtc(prevDay),
      system,
      good,
      activeShockIds: shockIds,
      frontline
    },
    shockCatalog
  );
  const b = computeGoodPrice(
    {
      profileSeed,
      dayKey: dayKeyUtc(day),
      weekKey: weekKeyUtc(day),
      system,
      good,
      activeShockIds: shockIds,
      frontline
    },
    shockCatalog
  );
  if (b > a) return 'up';
  if (b < a) return 'down';
  return 'flat';
}
