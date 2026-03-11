import { describe, expect, it } from 'vitest';
import sketchesRaw from '../../content/oz-chronicle/sketches.json';

describe('oz chronicle story sketches content', () => {
  it('has unique sketch ids and unlock rules', () => {
    const parsed = sketchesRaw as {
      sketches: Array<{ id: string; title: string; caption: string; unlockRule: string }>;
    };

    expect(parsed.sketches.length).toBeGreaterThanOrEqual(56);
    const ids = parsed.sketches.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(parsed.sketches.every((entry) => entry.unlockRule.length > 0)).toBe(true);
  });
});
