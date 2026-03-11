import { describe, expect, it } from 'vitest';
import { createSnakeState, placeFood, queueDirection, stepSnakeState, type SnakeState } from './logic';

function fixedState(overrides: Partial<SnakeState>): SnakeState {
  return {
    width: 6,
    height: 6,
    snake: [
      { x: 2, y: 2 },
      { x: 1, y: 2 },
      { x: 0, y: 2 }
    ],
    direction: 'right',
    queuedDirection: null,
    food: { x: 5, y: 5 },
    score: 0,
    gameOver: false,
    ...overrides
  };
}

describe('snake logic', () => {
  it('moves one cell each tick in active direction', () => {
    const state = fixedState({});
    const next = stepSnakeState(state, () => 0);
    expect(next.snake[0]).toEqual({ x: 3, y: 2 });
    expect(next.snake).toHaveLength(3);
  });

  it('grows and increments score when food is eaten', () => {
    const state = fixedState({ food: { x: 3, y: 2 } });
    const next = stepSnakeState(state, () => 0);
    expect(next.score).toBe(1);
    expect(next.snake).toHaveLength(4);
    expect(next.snake[0]).toEqual({ x: 3, y: 2 });
  });

  it('does not allow immediate reverse direction', () => {
    const state = fixedState({ direction: 'right' });
    const reversed = queueDirection(state, 'left');
    expect(reversed.queuedDirection).toBeNull();
  });

  it('ends game on wall collision', () => {
    const state = fixedState({
      snake: [{ x: 5, y: 0 }],
      direction: 'right'
    });
    const next = stepSnakeState(state, () => 0);
    expect(next.gameOver).toBe(true);
  });

  it('ends game on self collision', () => {
    const state = fixedState({
      snake: [
        { x: 2, y: 2 },
        { x: 2, y: 3 },
        { x: 3, y: 3 },
        { x: 3, y: 2 },
        { x: 3, y: 1 },
        { x: 2, y: 1 }
      ],
      direction: 'right'
    });
    const next = stepSnakeState(state, () => 0);
    expect(next.gameOver).toBe(true);
  });

  it('places food only on empty cells', () => {
    const food = placeFood(
      3,
      2,
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 }
      ],
      () => 0
    );

    expect(food).toEqual({ x: 2, y: 1 });
  });

  it('creates a playable initial state', () => {
    const state = createSnakeState(10, 10, () => 0);
    expect(state.snake).toHaveLength(3);
    expect(state.gameOver).toBe(false);
    expect(state.food).not.toBeNull();
  });
});
