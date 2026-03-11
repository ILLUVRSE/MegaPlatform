import { describe, expect, it } from 'vitest';
import { rankKeywordResults, tokenizeQuery } from '../../lib/search/keyword';

describe('keyword search ranking', () => {
  it('tokenizes and removes short/noisy fragments', () => {
    expect(tokenizeQuery('AI & VR in U.S. gaming')).toEqual(['ai', 'vr', 'in', 'u', 's', 'gaming'].filter((t) => t.length > 1));
  });

  it('prioritizes stronger lexical matches over weaker matches', () => {
    const now = new Date('2026-03-02T00:00:00Z');
    const ranked = rankKeywordResults(
      'gaming market',
      [
        {
          id: 'strong',
          title: 'Gaming market surges',
          globalScore: 0.4,
          updatedAt: now
        },
        {
          id: 'weak',
          title: 'Market update',
          globalScore: 0.9,
          updatedAt: now
        }
      ],
      now
    );

    expect(ranked[0]?.id).toBe('strong');
  });
});
