import { createSeededRng, hashStringToSeed } from '../rng';
import type { FactionId, StarlightProfile } from '../rules';
import type { UniverseDefinition, UniverseSystem } from '../world/universe';
import { buildRoute } from '../run/route';
import type { GoodsCatalog } from './goods';
import { dayKeyUtc } from '../world/time';

export interface TradeContract {
  id: string;
  originSystemId: string;
  destinationSystemId: string;
  goodId: string;
  quantity: number;
  payoutCredits: number;
  payoutStanding: Partial<Record<FactionId, number>>;
  moduleRewardId: string | null;
  expiryDayKey: string;
  smuggling: boolean;
  requiresEscort: boolean;
}

function addUtcDays(dayKey: string, days: number): string {
  const [year, month, day] = dayKey.split('-').map((n) => Number.parseInt(n, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return dayKeyUtc(date);
}

function safeInt(nextInt: (min: number, max: number) => number, min: number, max: number): number {
  return Math.max(min, Math.min(max, nextInt(min, max)));
}

function compareDayKey(a: string, b: string): number {
  return a.localeCompare(b);
}

function factionStandingDelta(faction: FactionId, amount: number): Partial<Record<FactionId, number>> {
  if (faction === 'concordium') return { concordium: amount };
  if (faction === 'freebelt') return { freebelt: amount };
  return { astral: amount };
}

function pickContractGood(system: UniverseSystem, goods: GoodsCatalog, rng: ReturnType<typeof createSeededRng>): { goodId: string; smuggling: boolean } {
  const legalPool = goods.goods.filter((good) => good.legality === 'legal');
  const illegalPool = goods.goods.filter((good) => good.legality === 'contraband');
  const allowSmuggle = system.tags.includes('blackmarket') || system.security !== 'SAFE';
  if (allowSmuggle && illegalPool.length > 0 && rng.next() < 0.28) {
    const smuggleGood = illegalPool[Math.max(0, Math.min(illegalPool.length - 1, rng.nextInt(0, illegalPool.length - 1)))];
    return { goodId: smuggleGood.id, smuggling: true };
  }
  const good = legalPool[Math.max(0, Math.min(legalPool.length - 1, rng.nextInt(0, legalPool.length - 1)))] ?? goods.goods[0];
  return { goodId: good.id, smuggling: false };
}

export function generateContractsForSystem(
  universe: UniverseDefinition,
  goods: GoodsCatalog,
  profile: StarlightProfile,
  systemId: string,
  dayKey: string,
  count = 3
): TradeContract[] {
  const origin = universe.systems.find((entry) => entry.id === systemId);
  if (!origin) return [];
  const others = universe.systems.filter((entry) => entry.id !== origin.id);
  if (others.length === 0) return [];

  const rng = createSeededRng((profile.seedBase ^ hashStringToSeed(`contracts:${systemId}:${dayKey}`)) >>> 0);
  const result: TradeContract[] = [];

  for (let i = 0; i < count; i += 1) {
    const destination = others[Math.max(0, Math.min(others.length - 1, rng.nextInt(0, others.length - 1)))] ?? others[0];
    const { goodId, smuggling } = pickContractGood(origin, goods, rng);
    const distance = Math.max(1, buildRoute(universe, origin.id, destination.id).length - 1);
    const qty = smuggling ? safeInt(rng.nextInt, 4, 10) : safeInt(rng.nextInt, 8, 14);
    const basePayout = smuggling ? 38 : 24;
    const payoutCredits = basePayout * qty + distance * (smuggling ? 44 : 22);
    const standing = smuggling ? 2 : 1;
    const expiryDays = smuggling ? safeInt(rng.nextInt, 2, 4) : safeInt(rng.nextInt, 3, 6);
    const requiresEscort = distance >= 3 && rng.next() < 0.38;

    result.push({
      id: `ct-${hashStringToSeed(`${origin.id}:${destination.id}:${goodId}:${dayKey}:${i}`)}`,
      originSystemId: origin.id,
      destinationSystemId: destination.id,
      goodId,
      quantity: qty,
      payoutCredits,
      payoutStanding: factionStandingDelta(origin.controllingFaction, standing),
      moduleRewardId: rng.next() < 0.16 ? 'hidden-compartments' : null,
      expiryDayKey: addUtcDays(dayKey, expiryDays),
      smuggling,
      requiresEscort
    });
  }

  return result;
}

export function pruneExpiredContracts(contracts: TradeContract[], dayKey: string): TradeContract[] {
  return contracts.filter((entry) => compareDayKey(dayKey, entry.expiryDayKey) <= 0);
}

export function resolveDeliveredContracts(profile: StarlightProfile, dayKey: string): { profile: StarlightProfile; delivered: TradeContract[] } {
  const delivered = profile.activeContracts.filter((entry) => entry.destinationSystemId === profile.currentSystemId && compareDayKey(dayKey, entry.expiryDayKey) <= 0);
  if (delivered.length === 0) return { profile, delivered: [] };

  const cargo = { ...profile.cargo };
  let creditsGain = 0;
  let c = 0;
  let f = 0;
  let a = 0;
  const modules = [...profile.inventory.modules];

  for (let i = 0; i < delivered.length; i += 1) {
    const contract = delivered[i];
    const have = cargo[contract.goodId]?.qty ?? 0;
    if (have < contract.quantity) continue;

    const left = have - contract.quantity;
    if (left <= 0) delete cargo[contract.goodId];
    else cargo[contract.goodId] = { ...cargo[contract.goodId], qty: left };

    creditsGain += contract.payoutCredits;
    c += contract.payoutStanding.concordium ?? 0;
    f += contract.payoutStanding.freebelt ?? 0;
    a += contract.payoutStanding.astral ?? 0;

    if (contract.moduleRewardId && !modules.includes(contract.moduleRewardId)) {
      modules.push(contract.moduleRewardId);
    }
  }

  const remaining = profile.activeContracts.filter((entry) => !delivered.some((hit) => hit.id === entry.id));

  return {
    delivered,
    profile: {
      ...profile,
      cargo,
      activeContracts: remaining,
      contractsCompleted: profile.contractsCompleted + delivered.length,
      inventory: {
        ...profile.inventory,
        credits: profile.inventory.credits + creditsGain,
        modules
      },
      factions: {
        concordium: profile.factions.concordium + c,
        freebelt: profile.factions.freebelt + f,
        astral: profile.factions.astral + a
      }
    }
  };
}
