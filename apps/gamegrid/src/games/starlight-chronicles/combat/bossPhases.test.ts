import { describe, expect, it } from 'vitest';
import { resolveBossPhase } from './combatRules';

describe('starlight boss phase logic', () => {
  it('resolves boss phase by hp ratio thresholds', () => {
    const phases = [
      { id: 'p1', hpThreshold: 0.7, pattern: 'aimed', telegraphMs: 700 },
      { id: 'p2', hpThreshold: 0.35, pattern: 'burst', telegraphMs: 500 },
      { id: 'p3', hpThreshold: 0, pattern: 'spiral', telegraphMs: 420 }
    ] as const;

    expect(resolveBossPhase(100, 100, [...phases])?.id).toBe('p1');
    expect(resolveBossPhase(50, 100, [...phases])?.id).toBe('p2');
    expect(resolveBossPhase(20, 100, [...phases])?.id).toBe('p3');
  });
});
