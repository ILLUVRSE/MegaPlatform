import { describe, expect, it } from 'vitest';
import { createTableBounds } from './physics';
import { autoSelectRodIndex, createRods } from './rods';

describe('foosball rod selection', () => {
  it('auto-select maps x-zones to expected rod', () => {
    const bounds = createTableBounds();
    const rods = createRods(bounds, 'player');

    expect(autoSelectRodIndex(rods[0].x - 40, rods)).toBe(0);
    expect(autoSelectRodIndex(rods[1].x, rods)).toBe(1);
    expect(autoSelectRodIndex(rods[2].x, rods)).toBe(2);
    expect(autoSelectRodIndex(rods[3].x + 40, rods)).toBe(3);
  });
});
