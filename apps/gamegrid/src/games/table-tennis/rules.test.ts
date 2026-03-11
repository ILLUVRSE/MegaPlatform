import { describe, expect, it } from 'vitest';
import { awardPoint, createPracticeState, createScoringState, registerPracticeShot } from './rules';

describe('table tennis rules', () => {
  it('enforces win-by-2 scoring at deuce', () => {
    let state = createScoringState('single_game', 0);

    for (let i = 0; i < 10; i += 1) {
      state = awardPoint(state, 0);
      state = awardPoint(state, 1);
    }

    expect(state.points).toEqual([10, 10]);
    expect(state.matchWinner).toBeNull();

    state = awardPoint(state, 0);
    expect(state.points).toEqual([11, 10]);
    expect(state.matchWinner).toBeNull();

    state = awardPoint(state, 0);
    expect(state.matchWinner).toBe(0);
    expect(state.points).toEqual([12, 10]);
  });

  it('alternates serve every 2 points then every 1 point at deuce', () => {
    let state = createScoringState('single_game', 0);

    expect(state.currentServer).toBe(0);
    state = awardPoint(state, 0);
    expect(state.currentServer).toBe(0);
    state = awardPoint(state, 1);
    expect(state.currentServer).toBe(1);
    state = awardPoint(state, 0);
    expect(state.currentServer).toBe(1);
    state = awardPoint(state, 1);
    expect(state.currentServer).toBe(0);

    for (let i = 0; i < 8; i += 1) {
      state = awardPoint(state, i % 2 === 0 ? 0 : 1);
    }

    expect(state.points).toEqual([6, 6]);

    for (let i = 0; i < 8; i += 1) {
      state = awardPoint(state, i % 2 === 0 ? 0 : 1);
    }

    expect(state.points).toEqual([10, 10]);
    const serverAtDeuce = state.currentServer;

    state = awardPoint(state, 0);
    expect(state.currentServer).not.toBe(serverAtDeuce);
    const nextServer = state.currentServer;
    state = awardPoint(state, 1);
    expect(state.currentServer).not.toBe(nextServer);
  });

  it('progresses best-of-3 and selects match winner', () => {
    let state = createScoringState('best_of_3', 0);

    for (let i = 0; i < 11; i += 1) {
      state = awardPoint(state, 0);
    }

    expect(state.gamesWon).toEqual([1, 0]);
    expect(state.matchWinner).toBeNull();
    expect(state.points).toEqual([0, 0]);

    for (let i = 0; i < 11; i += 1) {
      state = awardPoint(state, 0);
    }

    expect(state.gamesWon).toEqual([2, 0]);
    expect(state.matchWinner).toBe(0);
  });

  it('increments practice target score correctly', () => {
    let state = createPracticeState(3);
    state = registerPracticeShot(state, 25);
    state = registerPracticeShot(state, 0);
    state = registerPracticeShot(state, 35);

    expect(state.score).toBe(60);
    expect(state.targetHits).toBe(2);
    expect(state.ballsTaken).toBe(3);
    expect(state.ended).toBe(true);
  });
});
