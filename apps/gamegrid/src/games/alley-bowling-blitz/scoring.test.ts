import { describe, expect, it } from 'vitest';
import { computeScoreCard } from './scoring';

describe('alley bowling blitz scoring', () => {
  it('adds strike bonus from next two rolls', () => {
    const card = computeScoreCard([10, 3, 4]);
    expect(card.frames[0].total).toBe(17);
    expect(card.total).toBeGreaterThanOrEqual(24);
  });

  it('adds spare bonus from next one roll', () => {
    const card = computeScoreCard([6, 4, 7]);
    expect(card.frames[0].total).toBe(17);
  });

  it('supports 10th frame fill balls correctly', () => {
    const allStrikes = computeScoreCard([10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
    expect(allStrikes.total).toBe(300);

    const tenthSpare = computeScoreCard([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 3, 9]);
    expect(tenthSpare.frames[9].rolls).toEqual([7, 3, 9]);
    expect(tenthSpare.total).toBe(19);
  });
});
