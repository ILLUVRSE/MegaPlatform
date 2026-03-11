import { describe, expect, it } from 'vitest';
import { createInitialProfile } from '../rules';
import { buildHangarShareText, exportHangarCardPng } from './showroom';

describe('starlight showroom export', () => {
  it('export returns a valid PNG blob', async () => {
    const profile = createInitialProfile(720);
    const blob = await exportHangarCardPng(profile, {
      hullName: 'Pathfinder Frigate',
      hullClass: 'Frigate',
      hp: 102,
      dps: 70,
      scan: 1.1,
      cargo: 18,
      color: '#88bbff'
    });

    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('share text includes required fields', () => {
    const profile = createInitialProfile(721);
    const lines = buildHangarShareText(profile, {
      hullName: 'Pathfinder Frigate',
      hullClass: 'Frigate',
      hp: 102,
      dps: 70,
      scan: 1.1,
      cargo: 18,
      color: '#88bbff'
    });

    expect(lines[0]).toContain('Pathfinder Frigate');
    expect(lines.some((line) => line.includes('HP'))).toBe(true);
    expect(lines.some((line) => line.includes('DPS'))).toBe(true);
    expect(lines.some((line) => line.includes('Scan'))).toBe(true);
    expect(lines.some((line) => line.includes('Cargo'))).toBe(true);
  });
});
