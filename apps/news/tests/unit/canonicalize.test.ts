import { describe, expect, it } from 'vitest';
import { contentHashFromText, normalizeUrl } from '../../lib/pipeline/canonicalize';

describe('canonicalization', () => {
  it('normalizes URL tracking params and trailing slash', () => {
    const normalized = normalizeUrl('https://example.com/path/?utm_source=x&b=2&a=1');
    expect(normalized).toBe('https://example.com/path?a=1&b=2');
  });

  it('creates stable hashes for equivalent text', () => {
    const a = contentHashFromText('Hello   World');
    const b = contentHashFromText('hello world');
    expect(a).toBe(b);
  });
});
