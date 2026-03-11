import { describe, expect, it } from 'vitest';
import { evaluateClusterQuality } from '../../lib/evaluation/clusterQuality';
import { evaluateSummaryQuality } from '../../lib/evaluation/summaryQuality';

describe('evaluation layer', () => {
  it('penalizes single-source over-merged clusters', () => {
    const result = evaluateClusterQuality({ articleCount: 8, sourceCount: 1, similaritySpread: 0.9 });
    expect(result.score).toBeLessThan(0.6);
  });

  it('requires citations and bullet quality', () => {
    const result = evaluateSummaryQuality({
      bullets: ['Too short', 'This is a valid bullet with context and detail.'],
      whyItMatters: ['This matters for market structure and policy response.'],
      citations: []
    });
    expect(result.score).toBeLessThan(0.8);
  });
});
