import { describe, expect, it } from 'vitest';
import { computeClusterScore } from '../../lib/ranking/score';

describe('ranking performance', () => {
  it('scores 10k clusters quickly', () => {
    const start = Date.now();
    let total = 0;
    for (let i = 0; i < 10_000; i += 1) {
      total += computeClusterScore({
        publishedAt: new Date(Date.now() - i * 1000),
        sourceDiversity: 3,
        articleCount: 5,
        category: 'global',
        sourceReputation: 0.7
      });
    }
    const elapsed = Date.now() - start;
    expect(total).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(500);
  });
});
