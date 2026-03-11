import { describe, expect, it } from 'vitest';
import manifest from './manifest.json';

describe('oz chronicle asset manifest', () => {
  it('lists required assets and valid asset paths', () => {
    const entries = (manifest as { assets: Array<{ key: string; file: string; role: string }> }).assets;
    expect(entries.length).toBeGreaterThanOrEqual(12);
    const keys = new Set(entries.map((entry) => entry.key));
    expect(keys.size).toBe(entries.length);

    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
      expect(entry.role.length).toBeGreaterThan(0);
      expect(entry.file.endsWith('.svg')).toBe(true);
      expect(entry.file.includes('..')).toBe(false);
      const resolved = new URL(`./${entry.file}`, import.meta.url);
      expect(resolved.pathname.includes('/assets/')).toBe(true);
    }
  });
});
