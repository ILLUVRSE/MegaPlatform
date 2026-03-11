import { describe, expect, it } from 'vitest';
import { createPoolTableGeometry } from './physics';
import { createRack } from './rack';
import { evaluateTrickShotSuccess, loadTrickShotCatalog } from './trickshots';

describe('pool trickshots', () => {
  it('validates catalog has >=10 entries with required fields', () => {
    const catalog = loadTrickShotCatalog();
    expect(catalog.shots.length).toBeGreaterThanOrEqual(10);
    for (let i = 0; i < catalog.shots.length; i += 1) {
      const shot = catalog.shots[i];
      expect(typeof shot.id).toBe('string');
      expect(shot.balls.some((b) => b.number === 0)).toBe(true);
      expect(shot.goal.type).toBe('pocket_ball');
      expect(typeof shot.goal.ballNumber).toBe('number');
    }
  });

  it('evaluates trickshot success when goal ball is pocketed', () => {
    const catalog = loadTrickShotCatalog();
    const shot = catalog.shots[0];
    const balls = createRack(shot.variant, createPoolTableGeometry());

    expect(evaluateTrickShotSuccess(shot, [shot.goal.ballNumber], balls)).toBe(true);
    expect(evaluateTrickShotSuccess(shot, [], balls)).toBe(false);
  });
});
