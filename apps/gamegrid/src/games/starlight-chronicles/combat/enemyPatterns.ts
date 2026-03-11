import missionsRaw from '../../../content/starlight-chronicles/missions.json';
import enemiesRaw from '../../../content/starlight-chronicles/enemies.json';

export type BulletPattern = 'spiral' | 'wave' | 'burst' | 'aimed' | 'sweeping-beam' | 'mines';

export interface BossPhase {
  id: string;
  hpThreshold: number;
  pattern: BulletPattern;
  telegraphMs: number;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  hp: number;
  speed: number;
  touchDamage: number;
  score: number;
  size: number;
  shootCooldownMs: number;
  bulletSpeed: number;
  bulletPattern: BulletPattern;
  isBoss: boolean;
  bossPhases?: BossPhase[];
}

export interface MissionWave {
  id: string;
  enemyId: string;
  count: number;
  spawnIntervalMs: number;
  formation: 'line' | 'zigzag' | 'arc' | 'boss' | 'wave';
}

export interface MissionDefinition {
  id: string;
  name: string;
  kind: 'combat' | 'boss';
  description: string;
  waves: MissionWave[];
  rewards: {
    credits: number;
    materials: number;
    moduleDropPool: string[];
  };
}

interface EnemyFile {
  enemies: EnemyDefinition[];
}

interface MissionFile {
  missions: MissionDefinition[];
}

export interface SpawnInstruction {
  waveIndex: number;
  enemyId: string;
  x: number;
  y: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isBossPhase(value: unknown): value is BossPhase {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.hpThreshold === 'number' &&
    typeof value.telegraphMs === 'number' &&
    (value.pattern === 'spiral' ||
      value.pattern === 'wave' ||
      value.pattern === 'burst' ||
      value.pattern === 'aimed' ||
      value.pattern === 'sweeping-beam' ||
      value.pattern === 'mines')
  );
}

function isEnemy(value: unknown): value is EnemyDefinition {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.hp === 'number' &&
    typeof value.speed === 'number' &&
    typeof value.touchDamage === 'number' &&
    typeof value.score === 'number' &&
    typeof value.size === 'number' &&
    typeof value.shootCooldownMs === 'number' &&
    typeof value.bulletSpeed === 'number' &&
    (value.bulletPattern === 'spiral' ||
      value.bulletPattern === 'wave' ||
      value.bulletPattern === 'burst' ||
      value.bulletPattern === 'aimed' ||
      value.bulletPattern === 'sweeping-beam' ||
      value.bulletPattern === 'mines') &&
    typeof value.isBoss === 'boolean' &&
    (value.bossPhases === undefined || (Array.isArray(value.bossPhases) && value.bossPhases.every(isBossPhase)))
  );
}

function isWave(value: unknown): value is MissionWave {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.enemyId === 'string' &&
    typeof value.count === 'number' &&
    typeof value.spawnIntervalMs === 'number' &&
    (value.formation === 'line' || value.formation === 'zigzag' || value.formation === 'arc' || value.formation === 'boss' || value.formation === 'wave')
  );
}

function isMission(value: unknown): value is MissionDefinition {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.kind === 'combat' || value.kind === 'boss') &&
    typeof value.description === 'string' &&
    Array.isArray(value.waves) &&
    value.waves.every(isWave) &&
    isRecord(value.rewards) &&
    typeof value.rewards.credits === 'number' &&
    typeof value.rewards.materials === 'number' &&
    Array.isArray(value.rewards.moduleDropPool)
  );
}

export function loadEnemies(): EnemyDefinition[] {
  const parsed = enemiesRaw as unknown as EnemyFile;
  if (!parsed || !Array.isArray(parsed.enemies) || !parsed.enemies.every(isEnemy)) {
    throw new Error('starlight enemies json invalid');
  }
  return parsed.enemies;
}

export function loadMissions(): MissionDefinition[] {
  const parsed = missionsRaw as unknown as MissionFile;
  if (!parsed || !Array.isArray(parsed.missions) || !parsed.missions.every(isMission)) {
    throw new Error('starlight missions json invalid');
  }
  return parsed.missions;
}

export function buildWaveSpawns(wave: MissionWave, spawned: number, width: number): SpawnInstruction {
  const laneCount = Math.max(1, Math.min(8, wave.count));
  if (wave.formation === 'boss') {
    return {
      waveIndex: spawned,
      enemyId: wave.enemyId,
      x: width * 0.5,
      y: 120
    };
  }

  const lane = spawned % laneCount;
  const lanePadding = 80;
  const laneWidth = (width - lanePadding * 2) / laneCount;
  const xBase = lanePadding + laneWidth * (lane + 0.5);

  if (wave.formation === 'line') {
    return { waveIndex: spawned, enemyId: wave.enemyId, x: xBase, y: -30 };
  }

  if (wave.formation === 'zigzag') {
    const offset = spawned % 2 === 0 ? -26 : 26;
    return { waveIndex: spawned, enemyId: wave.enemyId, x: xBase + offset, y: -30 };
  }

  if (wave.formation === 'wave') {
    return { waveIndex: spawned, enemyId: wave.enemyId, x: xBase + Math.sin(spawned * 0.6) * 32, y: -40 };
  }

  const arcOffset = Math.sin((lane / Math.max(1, laneCount - 1)) * Math.PI) * 52;
  return { waveIndex: spawned, enemyId: wave.enemyId, x: xBase, y: -40 - arcOffset };
}
