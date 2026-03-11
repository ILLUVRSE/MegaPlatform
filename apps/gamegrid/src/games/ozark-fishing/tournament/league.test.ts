import { describe, expect, it } from 'vitest';
import { applyLeagueMatchResult, createLeagueState, nextPlayableLeagueMatch } from './league';
import { deterministicSeedOrder } from './bracket';

describe('ozark tournament league', () => {
  it('creates round robin schedule for 4 players', () => {
    const seeded = deterministicSeedOrder(['a', 'b', 'c', 'd'], 99);
    const league = createLeagueState(seeded, true);
    // n*(n-1)/2 matches for round-robin
    expect(league.matches.length).toBe(6);
  });

  it('updates standings points correctly', () => {
    const seeded = deterministicSeedOrder(['a', 'b', 'c', 'd'], 100);
    const league = createLeagueState(seeded, true);
    const match = nextPlayableLeagueMatch(league);
    expect(match).toBeTruthy();
    if (!match) return;

    applyLeagueMatchResult(
      league,
      match.id,
      {
        winnerId: match.home,
        loserId: match.away,
        tieBreakData: { primary: 1, secondary: 1, tertiary: 1, rule: 'test' },
        standings: [
          { playerId: match.home, totalWeight: 8, bestFish: 3, lastCatchTimeMs: 800, firstCatchTimeMs: 400 },
          { playerId: match.away, totalWeight: 7, bestFish: 2, lastCatchTimeMs: 900, firstCatchTimeMs: 500 }
        ]
      },
      'derby'
    );

    const home = league.standings.find((s) => s.playerId === match.home);
    const away = league.standings.find((s) => s.playerId === match.away);
    expect(home?.points).toBe(3);
    expect(away?.points).toBe(0);
  });
});
