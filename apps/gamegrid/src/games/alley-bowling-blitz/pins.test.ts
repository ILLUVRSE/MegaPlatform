import { describe, expect, it } from 'vitest';
import { countStandingPins, isPinStanding } from './pins';
import type { PinState } from './types';

function makePin(id: number, angle: number, fallen: boolean, active = true): PinState {
  return {
    id,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle,
    angVel: 0,
    fallen,
    sleeping: true,
    active
  };
}

describe('alley bowling pin standing detection', () => {
  it('counts standing pins from state set correctly', () => {
    const pins: PinState[] = [
      makePin(1, 0.1, false),
      makePin(2, 0.8, true),
      makePin(3, 0.2, false),
      makePin(4, 0.1, false, false)
    ];

    expect(isPinStanding(pins[0])).toBe(true);
    expect(isPinStanding(pins[1])).toBe(false);
    expect(countStandingPins(pins)).toBe(2);
  });
});
