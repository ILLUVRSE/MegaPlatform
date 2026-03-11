export type DamageType = 'EM' | 'Kinetic' | 'Thermal' | 'Plasma';

export type ModuleSlot = 'primary' | 'secondary' | 'defenseA' | 'defenseB' | 'utility' | 'rig';

export type ModuleCategory = 'weapon' | 'defense' | 'utility' | 'rig';

export type WeaponPattern = 'pulse' | 'scatter' | 'missile' | 'burst';
export type EnemyPathType = 'straight' | 'sine' | 'zigzag' | 'dive';
export type EnemyFirePattern = 'aimed' | 'spread3' | 'burst5' | 'none';

export interface WeaponProfile {
  pattern: WeaponPattern;
  projectileSpeed: number;
  spreadDeg: number;
  burstCount: number;
  burstGapMs: number;
  heatPerShot: number;
}

export interface ModuleDef {
  id: string;
  name: string;
  slot: ModuleSlot;
  category: ModuleCategory;
  rarity: 'common' | 'rare' | 'epic';
  powerCost: number;
  heatPerSecond: number;
  damageType?: DamageType;
  damage?: number;
  fireRate?: number;
  weapon?: Partial<WeaponProfile>;
  stats?: Partial<ShipStats>;
  affixes?: string[];
  signatureTech?: boolean;
}

export interface PerkDef {
  id: string;
  name: string;
  description: string;
  stats: Partial<ShipStats>;
}

export interface EnemyArchetype {
  id: string;
  hp: number;
  speed: number;
  fireRate: number;
  bulletSpeed: number;
  damageType: DamageType;
  score: number;
  contactDamage?: number;
  resistances?: Partial<Record<DamageType, number>>;
}

export interface SpawnInstruction {
  t: number;
  enemyId: string;
  count: number;
  formation: 'line' | 'v' | 'circle' | 'staggered';
  pathType?: EnemyPathType;
  firePattern?: EnemyFirePattern;
  hpScale?: number;
  midboss?: boolean;
}

export interface MissionDef {
  id: string;
  name: string;
  description: string;
  waveId: string;
  difficulty: number;
  hasFinalBoss: boolean;
  midbossAtSec?: number;
  finalBossId?: string;
  signatureRewardId?: string;
}

export interface WaveDef {
  id: string;
  durationSec: number;
  spawns: SpawnInstruction[];
}

export interface ShipStats {
  maxHull: number;
  maxShield: number;
  shieldRegen: number;
  shieldRegenDelay: number;
  accel: number;
  damping: number;
  idleDampingBoost: number;
  maxSpeed: number;
  turnRate: number;
  primaryDamage: number;
  secondaryDamage: number;
  fireRate: number;
  projectileSpeed: number;
  spreadDeg: number;
  critChance: number;
  blinkCooldown: number;
  blinkDistance: number;
  lootBonus: number;
  lootMagnet: number;
  heatCapacity: number;
  heatDissipation: number;
  overheatFirePenalty: number;
  damageReduction: number;
  powerBudget: number;
}

export interface ActiveRunState {
  missionId: string;
  selectedPerkId: string | null;
  seed: number;
  earnedCredits: number;
  earnedLoot: string[];
  defeated: boolean;
}

export interface SaveBlob {
  version: number;
  credits: number;
  materials: number;
  inventory: string[];
  equippedSlots: Record<ModuleSlot, string | null>;
  unlocks: {
    signatureTech: string[];
  };
  bossKills: string[];
  settings: {
    mute: boolean;
    reducedEffects: boolean;
  };
  activeRun: ActiveRunState | null;
}

export interface SortieResult {
  missionId: string;
  won: boolean;
  score: number;
  credits: number;
  salvage: number;
  modules: string[];
  signatureTech?: string;
}

export interface AppliedWeaponConfig {
  moduleId: string | null;
  damageType: DamageType;
  damage: number;
  fireRate: number;
  projectileSpeed: number;
  spreadDeg: number;
  pattern: WeaponPattern;
  burstCount: number;
  burstGapMs: number;
  heatPerShot: number;
}
