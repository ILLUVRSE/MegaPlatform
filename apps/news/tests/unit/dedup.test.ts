import { describe, expect, it } from 'vitest';
import { shouldJoinCluster } from '../../lib/pipeline/dedupCluster';

describe('dedup clustering rule', () => {
  it('joins by same canonical URL', () => {
    const joined = shouldJoinCluster({
      canonicalUrlA: 'https://a.com/x',
      canonicalUrlB: 'https://a.com/x',
      contentA: 'one two',
      contentB: 'different text',
      threshold: 0.9
    });

    expect(joined).toBe(true);
  });
});
