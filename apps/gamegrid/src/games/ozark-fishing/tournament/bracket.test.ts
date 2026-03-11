import { describe, expect, it } from 'vitest';
import { applyBracketMatchResult, createBracketState, deterministicSeedOrder, nextPlayableBracketMatch } from './bracket';
import type { MatchResult } from './types';

function mockResult(a: string, b: string, winnerId: string): MatchResult {
  return {
    winnerId,
    loserId: winnerId === a ? b : a,
    tieBreakData: {
      primary: 10,
      secondary: 5,
      tertiary: 1000,
      rule: 'test'
    },
    standings: [
      { playerId: winnerId, totalWeight: 10, bestFish: 4, lastCatchTimeMs: 1000, firstCatchTimeMs: 400 },
      { playerId: winnerId === a ? b : a, totalWeight: 9, bestFish: 3, lastCatchTimeMs: 1200, firstCatchTimeMs: 500 }
    ]
  };
}

describe('ozark tournament bracket', () => {
  it('generates deterministic seeding', () => {
    const one = deterministicSeedOrder(['p3', 'p1', 'p2', 'p4'], 44).map((s) => s.playerId);
    const two = deterministicSeedOrder(['p3', 'p1', 'p2', 'p4'], 44).map((s) => s.playerId);
    expect(one).toEqual(two);
  });

  it('builds correct bracket rounds for 4,5,8,16 players', () => {
    const counts = [4, 5, 8, 16];
    for (let i = 0; i < counts.length; i += 1) {
      const n = counts[i];
      const ids = Array.from({ length: n }, (_, idx) => `p${idx + 1}`);
      const seeded = deterministicSeedOrder(ids, 90 + n);
      const bracket = createBracketState(seeded);
      expect(bracket.rounds).toBe(Math.log2(bracket.size));
      expect(bracket.matches.length).toBe(bracket.size - 1);
    }
  });

  it('produces same bracket layout for same roster and seed', () => {
    const roster = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
    const one = createBracketState(deterministicSeedOrder(roster, 321));
    const two = createBracketState(deterministicSeedOrder(roster, 321));
    expect(one.matches).toEqual(two.matches);
  });

  it('advances winners through rounds', () => {
    const seeded = deterministicSeedOrder(['a', 'b', 'c', 'd'], 15);
    const bracket = createBracketState(seeded);

    let match = nextPlayableBracketMatch(bracket);
    expect(match).toBeTruthy();
    while (match) {
      const a = match.playerA as string;
      const b = match.playerB as string;
      applyBracketMatchResult(bracket, match.id, mockResult(a, b, a));
      match = nextPlayableBracketMatch(bracket);
    }

    const final = bracket.matches.find((m) => m.round === bracket.rounds && m.slot === 0);
    expect(final?.winnerId).toBeTruthy();
  });
});
