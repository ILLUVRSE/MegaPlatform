import { createSeededRng, hashStringToSeed } from '../rng';
import type { UniverseDefinition } from './universe';
import { weekKeyUtc } from './time';

export interface FrontlineState {
  weekKey: string;
  contestedSystemIds: string[];
}

export interface GalacticReport {
  weekKey: string;
  contestedSystemIds: string[];
  headline: string;
  notes: string[];
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

export function computeFrontlineState(universe: UniverseDefinition, profileSeed: number, weekKey: string): FrontlineState {
  const systems = universe.systems.filter((entry) => typeof entry.id === 'string' && entry.id.length > 0);
  if (systems.length === 0) {
    return {
      weekKey,
      contestedSystemIds: []
    };
  }

  const rng = createSeededRng((profileSeed ^ hashStringToSeed(`frontline:${weekKey}`)) >>> 0);
  const count = Math.max(1, Math.min(2, systems.length, rng.nextInt(1, 2)));
  const picks: string[] = [];
  const used = new Set<number>();
  let safety = 0;

  while (picks.length < count && used.size < systems.length && safety < systems.length * 8) {
    safety += 1;
    const idx = nextDeterministicIndex(rng, systems.length);
    if (used.has(idx)) continue;
    used.add(idx);
    const system = systems[idx];
    if (system) {
      picks.push(system.id);
    }
  }

  if (picks.length < count) {
    for (let i = 0; i < systems.length && picks.length < count; i += 1) {
      if (used.has(i)) continue;
      picks.push(systems[i].id);
    }
  }

  picks.sort();
  return {
    weekKey,
    contestedSystemIds: picks
  };
}

export function frontlinePiracyBonus(frontline: FrontlineState, systemId: string): number {
  return frontline.contestedSystemIds.includes(systemId) ? 0.14 : 0;
}

export function generateGalacticReport(universe: UniverseDefinition, profileSeed: number, weekKey: string): GalacticReport {
  const frontline = computeFrontlineState(universe, profileSeed, weekKey);
  const names = frontline.contestedSystemIds
    .map((id) => universe.systems.find((system) => system.id === id)?.name ?? id)
    .sort();

  return {
    weekKey,
    contestedSystemIds: frontline.contestedSystemIds,
    headline: names.length > 0 ? `Frontline pressure rising near ${names.join(' / ')}` : 'No frontline activity this week',
    notes: [
      'Contested systems have higher trade price variance.',
      'Piracy pressure and mission turnover increase in contested lanes.'
    ]
  };
}

export function getFrontlineForNow(universe: UniverseDefinition, profileSeed: number, now = new Date()): FrontlineState {
  return computeFrontlineState(universe, profileSeed, weekKeyUtc(now));
}
