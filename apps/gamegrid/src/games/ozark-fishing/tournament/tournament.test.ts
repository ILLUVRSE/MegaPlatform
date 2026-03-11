import { describe, expect, it } from 'vitest';
import { completeCurrentMatch, createTournamentState, currentMatchAssignment, startTournament } from './tournament';

describe('ozark tournament state machine', () => {
  it('transitions lobby -> match -> complete for small bracket', () => {
    const state = createTournamentState(555, ['a', 'b', 'c', 'd'], {
      enabled: true,
      format: 'bracket',
      matchType: 'derby',
      durationSec: 180,
      name: 'Night'
    });
    startTournament(state);

    expect(state.phase).toBe('match');
    while (state.phase !== 'complete') {
      const assignment = currentMatchAssignment(state);
      expect(assignment).toBeTruthy();
      if (!assignment) break;
      completeCurrentMatch(state, [
        { playerId: assignment.players[0], totalWeight: 10, bestFish: 4, lastCatchTimeMs: 1000, firstCatchTimeMs: 500 },
        { playerId: assignment.players[1], totalWeight: 8, bestFish: 3, lastCatchTimeMs: 1200, firstCatchTimeMs: 600 }
      ]);
    }

    expect(state.finalStandings.length).toBeGreaterThanOrEqual(2);
  });

  it('applies derby and big-catch tie break deterministically', () => {
    const derby = createTournamentState(7, ['a', 'b', 'c', 'd'], {
      enabled: true,
      format: 'bracket',
      matchType: 'derby',
      durationSec: 180,
      name: 'Derby'
    });
    startTournament(derby);
    const matchA = currentMatchAssignment(derby);
    if (!matchA) throw new Error('missing derby match');
    const derbyResult = completeCurrentMatch(derby, [
      { playerId: matchA.players[0], totalWeight: 10, bestFish: 4, lastCatchTimeMs: 900, firstCatchTimeMs: 400 },
      { playerId: matchA.players[1], totalWeight: 10, bestFish: 4, lastCatchTimeMs: 1100, firstCatchTimeMs: 300 }
    ]);
    expect(derbyResult.result.winnerId).toBe(matchA.players[0]);

    const big = createTournamentState(7, ['a', 'b', 'c', 'd'], {
      enabled: true,
      format: 'bracket',
      matchType: 'big_catch',
      durationSec: 180,
      name: 'Big'
    });
    startTournament(big);
    const matchB = currentMatchAssignment(big);
    if (!matchB) throw new Error('missing big-catch match');
    const bigResult = completeCurrentMatch(big, [
      { playerId: matchB.players[0], totalWeight: 20, bestFish: 6, lastCatchTimeMs: 900, firstCatchTimeMs: 550 },
      { playerId: matchB.players[1], totalWeight: 20, bestFish: 6, lastCatchTimeMs: 800, firstCatchTimeMs: 530 }
    ]);
    expect(bigResult.result.winnerId).toBe(matchB.players[1]);
  });
});
