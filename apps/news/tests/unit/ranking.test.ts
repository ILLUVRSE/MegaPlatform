import { describe, expect, it } from 'vitest';
import { computeClusterScore } from '../../lib/ranking/score';

describe('ranking engine', () => {
  it('boosts vertical category', () => {
    const publishedAt = new Date(Date.now() - 60 * 60 * 1000);
    const globalScore = computeClusterScore({
      publishedAt,
      sourceDiversity: 4,
      articleCount: 4,
      category: 'global'
    });
    const verticalScore = computeClusterScore({
      publishedAt,
      sourceDiversity: 4,
      articleCount: 4,
      category: 'vertical'
    });

    expect(verticalScore).toBeGreaterThan(globalScore);
  });
});
