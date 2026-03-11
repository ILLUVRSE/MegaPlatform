import { describe, expect, it } from 'vitest';
import { cosineSimilarity, embedTextStub } from '../../lib/search/semantic';

describe('semantic search helpers', () => {
  it('ranks same text as more similar', () => {
    const a = embedTextStub('gaming platform creator economy');
    const b = embedTextStub('gaming platform creator economy');
    const c = embedTextStub('weather traffic report');

    expect(cosineSimilarity(a, b)).toBeGreaterThan(cosineSimilarity(a, c));
  });
});
