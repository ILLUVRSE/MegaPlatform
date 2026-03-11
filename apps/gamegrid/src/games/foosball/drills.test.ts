import { describe, expect, it } from 'vitest';
import { applyDrillEvent, createActiveDrillState, loadFoosballDrills } from './drills';

describe('foosball drills', () => {
  it('loads at least 10 drills with required fields', () => {
    const catalog = loadFoosballDrills();
    expect(catalog.drills.length).toBeGreaterThanOrEqual(10);

    for (let i = 0; i < catalog.drills.length; i += 1) {
      const drill = catalog.drills[i];
      expect(drill.id.length).toBeGreaterThan(0);
      expect(drill.instructions.length).toBeGreaterThan(0);
      expect(drill.goal.target).toBeGreaterThan(0);
      expect(drill.activeRods.length).toBeGreaterThan(0);
      expect(typeof drill.startBall.x).toBe('number');
      expect(typeof drill.startBall.vy).toBe('number');
    }
  });

  it('completes score-based and block-based drills by events', () => {
    const scoreDrill = createActiveDrillState({
      id: 'score-1',
      title: 'Score One',
      instructions: 'score',
      goal: { type: 'score', target: 2 },
      startBall: { x: 0, y: 0, vx: 0, vy: 0 },
      activeRods: ['strikers'],
      lockedRods: ['goalkeeper', 'defense', 'midfield']
    });

    const scoreDone = applyDrillEvent(applyDrillEvent(scoreDrill, { type: 'score' }), { type: 'score' });
    expect(scoreDone.completed).toBe(true);

    const blockDrill = createActiveDrillState({
      id: 'block-1',
      title: 'Block Two',
      instructions: 'block',
      goal: { type: 'block', target: 2 },
      startBall: { x: 0, y: 0, vx: 0, vy: 0 },
      activeRods: ['goalkeeper'],
      lockedRods: ['defense', 'midfield', 'strikers']
    });

    const blockDone = applyDrillEvent(applyDrillEvent(blockDrill, { type: 'block' }), { type: 'block' });
    expect(blockDone.completed).toBe(true);
  });
});
