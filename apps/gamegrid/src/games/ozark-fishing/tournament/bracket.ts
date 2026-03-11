import type { BracketMatch, BracketState, MatchResult, SeededPlayer, TournamentMatchType } from './types';

function nextPowerOfTwo(value: number): number {
  let n = 1;
  while (n < value) n <<= 1;
  return n;
}

function isPowerOfTwo(value: number): boolean {
  return value > 0 && (value & (value - 1)) === 0;
}

export function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function deterministicSeedOrder(playerIds: string[], roomSeed: number): SeededPlayer[] {
  const deduped = Array.from(new Set(playerIds.map((id) => String(id).trim()).filter(Boolean)));
  const sorted = deduped
    .map((playerId) => ({
      playerId,
      hash: stableHash(`${roomSeed}:${playerId}`)
    }))
    .sort((a, b) => (a.hash === b.hash ? a.playerId.localeCompare(b.playerId) : a.hash - b.hash));

  return sorted.map((entry, index) => ({
    playerId: entry.playerId,
    hash: entry.hash,
    seed: index + 1
  }));
}

function buildSeedPositions(size: number): number[] {
  if (!isPowerOfTwo(size)) throw new Error('bracket size must be power of two');
  if (size === 2) return [1, 2];
  const half = buildSeedPositions(size / 2);
  const mirrored = half.map((seed) => size + 1 - seed);
  const out: number[] = [];
  for (let i = 0; i < half.length; i += 1) {
    out.push(half[i], mirrored[i]);
  }
  return out;
}

function findMatch(state: BracketState, id: string): BracketMatch {
  const match = state.matches.find((m) => m.id === id);
  if (!match) throw new Error(`match not found: ${id}`);
  return match;
}

function propagateWinners(state: BracketState): void {
  for (let round = 2; round <= state.rounds; round += 1) {
    const roundMatches = state.matches.filter((m) => m.round === round);
    for (let i = 0; i < roundMatches.length; i += 1) {
      const match = roundMatches[i];
      if (match.sourceA) {
        const prevA = findMatch(state, match.sourceA);
        match.playerA = prevA.winnerId;
      }
      if (match.sourceB) {
        const prevB = findMatch(state, match.sourceB);
        match.playerB = prevB.winnerId;
      }
      if (match.status !== 'complete') {
        if (match.playerA && !match.playerB) {
          match.winnerId = match.playerA;
          match.loserId = null;
          match.status = 'complete';
        } else if (!match.playerA && match.playerB) {
          match.winnerId = match.playerB;
          match.loserId = null;
          match.status = 'complete';
        }
      }
    }
  }
}

export function createBracketState(seeded: SeededPlayer[]): BracketState {
  if (seeded.length < 2) throw new Error('tournament bracket requires at least 2 players');
  const size = nextPowerOfTwo(seeded.length);
  const rounds = Math.log2(size);
  const matches: BracketMatch[] = [];

  const seedByNumber = new Map<number, string>();
  for (let i = 0; i < seeded.length; i += 1) {
    seedByNumber.set(i + 1, seeded[i].playerId);
  }

  const positions = buildSeedPositions(size);
  for (let i = 0; i < size; i += 2) {
    const slot = i / 2;
    const a = seedByNumber.get(positions[i]) ?? null;
    const b = seedByNumber.get(positions[i + 1]) ?? null;
    const status = a && b ? 'pending' : 'complete';
    matches.push({
      id: `r1-m${slot + 1}`,
      round: 1,
      slot,
      playerA: a,
      playerB: b,
      winnerId: status === 'complete' ? a ?? b : null,
      loserId: null,
      status
    });
  }

  for (let round = 2; round <= rounds; round += 1) {
    const count = size / Math.pow(2, round);
    for (let slot = 0; slot < count; slot += 1) {
      matches.push({
        id: `r${round}-m${slot + 1}`,
        round,
        slot,
        playerA: null,
        playerB: null,
        winnerId: null,
        loserId: null,
        status: 'pending',
        sourceA: `r${round - 1}-m${slot * 2 + 1}`,
        sourceB: `r${round - 1}-m${slot * 2 + 2}`
      });
    }
  }

  const state: BracketState = { size, rounds, matches };
  propagateWinners(state);
  return state;
}

export function nextPlayableBracketMatch(state: BracketState): BracketMatch | null {
  propagateWinners(state);
  for (let round = 1; round <= state.rounds; round += 1) {
    const matches = state.matches.filter((m) => m.round === round).sort((a, b) => a.slot - b.slot);
    for (let i = 0; i < matches.length; i += 1) {
      const match = matches[i];
      if (match.status === 'pending' && !!match.playerA && !!match.playerB) return match;
    }
  }
  return null;
}

export function applyBracketMatchResult(state: BracketState, matchId: string, result: MatchResult): BracketState {
  const match = findMatch(state, matchId);
  match.result = result;
  match.winnerId = result.winnerId;
  match.loserId = result.loserId;
  match.status = 'complete';
  propagateWinners(state);
  return state;
}

export function bracketFinalStandings(state: BracketState, mode: TournamentMatchType): string[] {
  const finalMatch = state.matches.find((m) => m.round === state.rounds && m.slot === 0);
  const semifinalLosers = state.matches
    .filter((m) => m.round === Math.max(1, state.rounds - 1))
    .map((m) => m.loserId)
    .filter((id): id is string => !!id);

  const ordered = new Set<string>();
  if (finalMatch?.winnerId) ordered.add(finalMatch.winnerId);
  if (finalMatch?.loserId) ordered.add(finalMatch.loserId);

  semifinalLosers.sort();
  for (let i = 0; i < semifinalLosers.length; i += 1) ordered.add(semifinalLosers[i]);

  const losses = new Map<string, { round: number; metric: number }>();
  for (let i = 0; i < state.matches.length; i += 1) {
    const match = state.matches[i];
    if (!match.loserId || !match.result) continue;
    const score = match.result.standings.find((s) => s.playerId === match.loserId);
    losses.set(match.loserId, {
      round: match.round,
      metric: mode === 'derby' ? score?.totalWeight ?? 0 : score?.bestFish ?? 0
    });
  }

  const remaining = Array.from(losses.entries())
    .filter(([playerId]) => !ordered.has(playerId))
    .sort((a, b) => {
      if (b[1].round !== a[1].round) return b[1].round - a[1].round;
      if (b[1].metric !== a[1].metric) return b[1].metric - a[1].metric;
      return a[0].localeCompare(b[0]);
    })
    .map(([playerId]) => playerId);

  for (let i = 0; i < remaining.length; i += 1) ordered.add(remaining[i]);
  return Array.from(ordered);
}
