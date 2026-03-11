import type { WaveDef } from './starlightTypes';

export const WAVES: WaveDef[] = [
  {
    id: 'sector1-m1',
    durationSec: 90,
    spawns: [
      { t: 4, enemyId: 'scout', count: 6, formation: 'line', pathType: 'straight', firePattern: 'aimed' },
      { t: 10, enemyId: 'dart', count: 8, formation: 'staggered', pathType: 'zigzag', firePattern: 'none' },
      { t: 18, enemyId: 'turret', count: 4, formation: 'line', pathType: 'straight', firePattern: 'spread3' },
      { t: 29, enemyId: 'drone', count: 6, formation: 'v', pathType: 'sine', firePattern: 'aimed' },
      { t: 42, enemyId: 'sniper', count: 4, formation: 'line', pathType: 'straight', firePattern: 'aimed' },
      { t: 56, enemyId: 'bomber', count: 4, formation: 'v', pathType: 'dive', firePattern: 'spread3' },
      { t: 71, enemyId: 'dart', count: 10, formation: 'staggered', pathType: 'zigzag', firePattern: 'none' }
    ]
  },
  {
    id: 'sector1-m2',
    durationSec: 100,
    spawns: [
      { t: 4, enemyId: 'dart', count: 6, formation: 'line', pathType: 'zigzag', firePattern: 'none' },
      { t: 13, enemyId: 'sniper', count: 5, formation: 'line', pathType: 'straight', firePattern: 'aimed' },
      { t: 23, enemyId: 'bomber', count: 4, formation: 'v', pathType: 'dive', firePattern: 'spread3' },
      { t: 37, enemyId: 'drone', count: 8, formation: 'circle', pathType: 'sine', firePattern: 'aimed' },
      { t: 58, enemyId: 'midboss', count: 1, formation: 'line', pathType: 'straight', firePattern: 'burst5', midboss: true, hpScale: 1.1 },
      { t: 72, enemyId: 'turret', count: 6, formation: 'line', pathType: 'straight', firePattern: 'spread3' },
      { t: 84, enemyId: 'scout', count: 9, formation: 'staggered', pathType: 'sine', firePattern: 'aimed' }
    ]
  },
  {
    id: 'sector1-m3',
    durationSec: 112,
    spawns: [
      { t: 5, enemyId: 'scout', count: 8, formation: 'line', pathType: 'sine', firePattern: 'aimed' },
      { t: 16, enemyId: 'sniper', count: 5, formation: 'line', pathType: 'straight', firePattern: 'aimed' },
      { t: 28, enemyId: 'drone', count: 8, formation: 'circle', pathType: 'zigzag', firePattern: 'aimed' },
      { t: 43, enemyId: 'bomber', count: 6, formation: 'v', pathType: 'dive', firePattern: 'spread3' },
      { t: 66, enemyId: 'midboss', count: 1, formation: 'line', pathType: 'straight', firePattern: 'burst5', midboss: true, hpScale: 1.2 },
      { t: 83, enemyId: 'turret', count: 8, formation: 'line', pathType: 'straight', firePattern: 'spread3' },
      { t: 96, enemyId: 'dart', count: 10, formation: 'staggered', pathType: 'zigzag', firePattern: 'none' }
    ]
  }
];

export const WAVE_BY_ID = new Map(WAVES.map((wave) => [wave.id, wave]));
