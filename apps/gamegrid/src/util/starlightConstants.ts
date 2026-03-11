import type { ShipStats } from '../data/starlightTypes';

export const STARLIGHT_SAVE_KEY = 'gamegrid.starlight-chronicles.vertical-slice.v1';

export const BASE_SHIP_STATS: ShipStats = {
  maxHull: 220,
  maxShield: 160,
  shieldRegen: 7,
  shieldRegenDelay: 2.8,
  accel: 390,
  damping: 0.34,
  idleDampingBoost: 0.22,
  maxSpeed: 265,
  turnRate: 7,
  primaryDamage: 16,
  secondaryDamage: 42,
  fireRate: 6,
  projectileSpeed: 430,
  spreadDeg: 0,
  critChance: 0.04,
  blinkCooldown: 5,
  blinkDistance: 130,
  lootBonus: 0,
  lootMagnet: 70,
  heatCapacity: 100,
  heatDissipation: 24,
  overheatFirePenalty: 0.5,
  damageReduction: 0,
  powerBudget: 60
};

export const SCENE_KEYS = {
  boot: 'starlight-boot',
  preload: 'starlight-preload',
  menu: 'starlight-main-menu',
  hangar: 'starlight-hangar',
  missionSelect: 'starlight-mission-select',
  perkPick: 'starlight-perk-pick',
  sortie: 'starlight-sortie',
  results: 'starlight-results'
} as const;

export interface RunContext {
  missionId: string;
  perkId: string | null;
}

export const SORTIE_TUNING = {
  fixedDt: 1 / 60,
  boundsPaddingX: 36,
  boundsPaddingTop: 64,
  boundsPaddingBottom: 46,
  enemyContactDamage: 20,
  pickupCreditValue: 5,
  pickupDuplicateValue: 7,
  missionIntroSeconds: 2
} as const;
