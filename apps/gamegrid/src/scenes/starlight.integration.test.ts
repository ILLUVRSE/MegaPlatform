import { describe, expect, it } from 'vitest';
import { MODULES } from '../data/starlightModules';
import { PERKS } from '../data/starlightPerks';
import { ENEMIES } from '../data/starlightEnemies';
import { MISSIONS } from '../data/starlightMissions';
import { WAVES } from '../data/starlightWaves';

describe('starlight vertical slice data coverage', () => {
  it('includes expected minimum data', () => {
    expect(MODULES.length).toBeGreaterThanOrEqual(12);
    expect(PERKS.length).toBeGreaterThanOrEqual(9);
    expect(ENEMIES.length).toBeGreaterThanOrEqual(6);
    expect(MISSIONS.length).toBe(3);
    expect(WAVES.length).toBeGreaterThanOrEqual(3);
  });

  it('contains prism warden boss content', () => {
    expect(ENEMIES.some((enemy) => enemy.id === 'prism-warden')).toBe(true);
    expect(MISSIONS.some((mission) => mission.id === 's1-m2' && typeof mission.midbossAtSec === 'number')).toBe(true);
    expect(MISSIONS.some((mission) => mission.id === 's1-m3' && mission.hasFinalBoss && mission.finalBossId === 'prism-warden' && mission.signatureRewardId === 'sig-prism-breaker')).toBe(true);
  });
});
