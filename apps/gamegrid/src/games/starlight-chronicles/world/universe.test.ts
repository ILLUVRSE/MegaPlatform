import { describe, expect, it } from 'vitest';
import { loadUniverse } from './universe';

describe('starlight universe content', () => {
  it('loads valid regions and systems with security mix', () => {
    const universe = loadUniverse();
    expect(universe.regions.length).toBeGreaterThanOrEqual(2);
    expect(universe.systems.length).toBeGreaterThanOrEqual(10);

    const sec = new Set(universe.systems.map((system) => system.security));
    expect(sec.has('SAFE')).toBe(true);
    expect(sec.has('LOW')).toBe(true);
    expect(sec.has('NULL')).toBe(true);
  });
});
