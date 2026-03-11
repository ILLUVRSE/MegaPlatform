import type { ModuleDef } from './starlightTypes';

export const MODULES: ModuleDef[] = [
  {
    id: 'w-pulse-l1',
    name: 'Pulse Cannon Mk-I',
    slot: 'primary',
    category: 'weapon',
    rarity: 'common',
    powerCost: 12,
    heatPerSecond: 8,
    damageType: 'Kinetic',
    damage: 12,
    fireRate: 7.5,
    weapon: { pattern: 'pulse', projectileSpeed: 440, spreadDeg: 0, burstCount: 1, burstGapMs: 0, heatPerShot: 6 },
    affixes: ['stable recoil', '+5% crit']
  },
  {
    id: 'w-scatter-l1',
    name: 'Scatter Lance',
    slot: 'primary',
    category: 'weapon',
    rarity: 'rare',
    powerCost: 14,
    heatPerSecond: 14,
    damageType: 'Thermal',
    damage: 9,
    fireRate: 5.8,
    weapon: { pattern: 'scatter', projectileSpeed: 360, spreadDeg: 15, burstCount: 4, burstGapMs: 0, heatPerShot: 10 },
    affixes: ['cone spread', '+close range burst']
  },
  {
    id: 'w-em-lance',
    name: 'EM Lance',
    slot: 'primary',
    category: 'weapon',
    rarity: 'rare',
    powerCost: 16,
    heatPerSecond: 14,
    damageType: 'EM',
    damage: 14,
    fireRate: 5,
    weapon: { pattern: 'pulse', projectileSpeed: 470, spreadDeg: 0, burstCount: 1, burstGapMs: 0, heatPerShot: 8 },
    affixes: ['shield strip']
  },
  {
    id: 'w-thermal-burst',
    name: 'Thermal Burst',
    slot: 'primary',
    category: 'weapon',
    rarity: 'rare',
    powerCost: 14,
    heatPerSecond: 18,
    damageType: 'Thermal',
    damage: 10,
    fireRate: 9,
    weapon: { pattern: 'burst', projectileSpeed: 420, spreadDeg: 5, burstCount: 2, burstGapMs: 70, heatPerShot: 7 },
    affixes: ['double tap']
  },
  {
    id: 'w-plasma-spike',
    name: 'Plasma Spike',
    slot: 'secondary',
    category: 'weapon',
    rarity: 'epic',
    powerCost: 18,
    heatPerSecond: 20,
    damageType: 'Plasma',
    damage: 34,
    fireRate: 1.7,
    weapon: { pattern: 'missile', projectileSpeed: 300, spreadDeg: 0, burstCount: 1, burstGapMs: 0, heatPerShot: 18 },
    affixes: ['armor crack']
  },
  {
    id: 'w-micro-missile',
    name: 'Micro Missile Rack',
    slot: 'secondary',
    category: 'weapon',
    rarity: 'common',
    powerCost: 11,
    heatPerSecond: 9,
    damageType: 'Kinetic',
    damage: 22,
    fireRate: 2.1,
    weapon: { pattern: 'burst', projectileSpeed: 320, spreadDeg: 8, burstCount: 2, burstGapMs: 90, heatPerShot: 12 },
    affixes: ['micro volley']
  },
  {
    id: 'w-shard-caster',
    name: 'Shard Caster',
    slot: 'secondary',
    category: 'weapon',
    rarity: 'rare',
    powerCost: 13,
    heatPerSecond: 12,
    damageType: 'Thermal',
    damage: 24,
    fireRate: 2.4,
    weapon: { pattern: 'scatter', projectileSpeed: 340, spreadDeg: 12, burstCount: 3, burstGapMs: 0, heatPerShot: 13 },
    affixes: ['fragment cone']
  },
  {
    id: 'd-shield-booster',
    name: 'Aegis Booster',
    slot: 'defenseA',
    category: 'defense',
    rarity: 'common',
    powerCost: 8,
    heatPerSecond: 1,
    stats: { maxShield: 35, shieldRegen: 2.5 },
    affixes: ['+shield']
  },
  {
    id: 'd-reactive-plate',
    name: 'Reactive Plate',
    slot: 'defenseB',
    category: 'defense',
    rarity: 'common',
    powerCost: 9,
    heatPerSecond: 0,
    stats: { maxHull: 45, damageReduction: 0.06 },
    affixes: ['+hull', '6% DR']
  },
  {
    id: 'd-repair-nanites',
    name: 'Repair Nanites',
    slot: 'defenseB',
    category: 'defense',
    rarity: 'rare',
    powerCost: 10,
    heatPerSecond: 2,
    stats: { shieldRegen: 3, maxHull: 20, shieldRegenDelay: -0.4 },
    affixes: ['regen burst']
  },
  {
    id: 'u-blink-tuner',
    name: 'Blink Tuner',
    slot: 'utility',
    category: 'utility',
    rarity: 'rare',
    powerCost: 9,
    heatPerSecond: 1,
    stats: { blinkCooldown: -1.2, maxSpeed: 35, blinkDistance: 18 },
    affixes: ['blink range']
  },
  {
    id: 'u-tractor',
    name: 'Tractor Lattice',
    slot: 'utility',
    category: 'utility',
    rarity: 'common',
    powerCost: 7,
    heatPerSecond: 0,
    stats: { lootBonus: 0.18, lootMagnet: 70 },
    affixes: ['loot magnet']
  },
  {
    id: 'r-radiator',
    name: 'Liquid Radiator',
    slot: 'rig',
    category: 'rig',
    rarity: 'common',
    powerCost: 6,
    heatPerSecond: 0,
    stats: { heatCapacity: 25, heatDissipation: 8 },
    affixes: ['cooling']
  },
  {
    id: 'r-thruster-grid',
    name: 'Thruster Grid',
    slot: 'rig',
    category: 'rig',
    rarity: 'rare',
    powerCost: 8,
    heatPerSecond: 0,
    stats: { accel: 35, maxSpeed: 40, turnRate: 1.5 },
    affixes: ['mobility']
  },
  {
    id: 'sig-prism-breaker',
    name: 'Signature Tech: Prism Breaker',
    slot: 'primary',
    category: 'weapon',
    rarity: 'epic',
    powerCost: 20,
    heatPerSecond: 22,
    damageType: 'Plasma',
    damage: 19,
    fireRate: 6.5,
    weapon: { pattern: 'burst', projectileSpeed: 500, spreadDeg: 2, burstCount: 3, burstGapMs: 50, heatPerShot: 8 },
    signatureTech: true,
    affixes: ['+35% vs Prism Warden']
  }
];

function assertModuleShape(module: ModuleDef): void {
  if (!module.id || !module.name) {
    // eslint-disable-next-line no-console
    console.error('[StarlightData] module id/name required');
  }
  if (module.powerCost < 0) {
    // eslint-disable-next-line no-console
    console.error(`[StarlightData] module ${module.id} powerCost must be >=0`);
  }
  if (module.category === 'weapon' && !module.damageType) {
    // eslint-disable-next-line no-console
    console.error(`[StarlightData] module ${module.id} weapon missing damageType`);
  }
}

MODULES.forEach(assertModuleShape);

export const MODULE_BY_ID = new Map(MODULES.map((module) => [module.id, module]));
