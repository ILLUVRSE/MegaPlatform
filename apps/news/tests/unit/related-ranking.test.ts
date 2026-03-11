import { describe, expect, it } from 'vitest';
import { rankRelatedStories } from '../../lib/search/related';

describe('related story ranking', () => {
  it('keeps semantic relevance as primary ranking signal', () => {
    const now = new Date('2026-03-02T00:00:00Z');
    const ranked = rankRelatedStories(
      [1, 0],
      [
        {
          id: 'high-semantic-old',
          title: 'High semantic old',
          storyVector: [1, 0],
          updatedAt: new Date('2026-02-20T00:00:00Z')
        },
        {
          id: 'low-semantic-fresh',
          title: 'Low semantic fresh',
          storyVector: [0.4, 0.6],
          updatedAt: now
        }
      ],
      2,
      now
    );

    expect(ranked[0]?.id).toBe('high-semantic-old');
    expect(ranked[0]?.similarity).toBeGreaterThan(ranked[1]?.similarity ?? 0);
  });

  it('uses freshness as a tie-breaker between similarly relevant stories', () => {
    const now = new Date('2026-03-02T00:00:00Z');
    const ranked = rankRelatedStories(
      [1, 0],
      [
        {
          id: 'fresh',
          title: 'Fresh match',
          storyVector: [1, 0],
          updatedAt: now
        },
        {
          id: 'old',
          title: 'Old match',
          storyVector: [1, 0],
          updatedAt: new Date('2026-02-25T00:00:00Z')
        }
      ],
      2,
      now
    );

    expect(ranked[0]?.id).toBe('fresh');
    expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 0);
  });
});
