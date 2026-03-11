import { describe, expect, it } from 'vitest';
import { buildInterestVector, personalizationMultiplier } from '../../lib/personalization/interestVector';

describe('personalization', () => {
  it('builds category affinity from interactions', () => {
    const vector = buildInterestVector([
      { interactionType: 'save', clusterCategory: 'vertical' },
      { interactionType: 'listen', clusterCategory: 'vertical' },
      { interactionType: 'skip', clusterCategory: 'global' }
    ]);

    expect(vector.vertical).toBeGreaterThan(vector.global);
    expect(personalizationMultiplier(vector, 'vertical')).toBeGreaterThan(1);
  });
});
