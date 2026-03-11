import rawPatterns from '../../content/goalie-gauntlet-patterns.json';
import { createSeededRng } from './rng';
import { GOALIE_ZONES, type GoalieDifficulty, type GoalieMode, type GoalieZone, type ScheduledShot, type ShotPatternCatalog, type ShotPatternDefinition, type ShotPatternEntry, type ShotType, type TelegraphType } from './types';

const ZONE_SET = new Set<string>(GOALIE_ZONES);
const TELEGRAPH_SET = new Set<TelegraphType>(['windup', 'glow', 'both']);
const SHOT_TYPE_SET = new Set<ShotType>(['straight', 'curve', 'one_timer']);

function isZone(value: unknown): value is GoalieZone {
  return typeof value === 'string' && ZONE_SET.has(value);
}

function isTelegraph(value: unknown): value is TelegraphType {
  return typeof value === 'string' && TELEGRAPH_SET.has(value as TelegraphType);
}

function isShotType(value: unknown): value is ShotType {
  return typeof value === 'string' && SHOT_TYPE_SET.has(value as ShotType);
}

function validateEntry(value: unknown): value is ShotPatternEntry {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  return (
    isZone(rec.zone) &&
    (typeof rec.realZone === 'undefined' || isZone(rec.realZone)) &&
    isTelegraph(rec.telegraph) &&
    typeof rec.speed === 'number' &&
    rec.speed >= 260 &&
    rec.speed <= 1400 &&
    (typeof rec.type === 'undefined' || isShotType(rec.type)) &&
    (typeof rec.fake === 'undefined' || typeof rec.fake === 'boolean') &&
    (typeof rec.fakeShiftAtMs === 'undefined' || (typeof rec.fakeShiftAtMs === 'number' && rec.fakeShiftAtMs >= 80 && rec.fakeShiftAtMs <= 480)) &&
    (typeof rec.deflection === 'undefined' || typeof rec.deflection === 'boolean') &&
    (typeof rec.spin === 'undefined' || typeof rec.spin === 'boolean') &&
    (typeof rec.rebound === 'undefined' || typeof rec.rebound === 'boolean') &&
    (typeof rec.reboundSpeedMultiplier === 'undefined' ||
      (typeof rec.reboundSpeedMultiplier === 'number' && rec.reboundSpeedMultiplier >= 1.02 && rec.reboundSpeedMultiplier <= 2.2)) &&
    (typeof rec.comboGapMs === 'undefined' || (typeof rec.comboGapMs === 'number' && rec.comboGapMs >= 80))
  );
}

function validatePattern(value: unknown): value is ShotPatternDefinition {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  return (
    typeof rec.id === 'string' &&
    rec.id.length > 0 &&
    typeof rec.name === 'string' &&
    rec.name.length > 0 &&
    typeof rec.description === 'string' &&
    rec.description.length > 0 &&
    Array.isArray(rec.tags) &&
    rec.tags.every((tag) => typeof tag === 'string') &&
    Array.isArray(rec.shots) &&
    rec.shots.length > 0 &&
    rec.shots.every(validateEntry)
  );
}

export function loadShotPatterns(): ShotPatternCatalog {
  const parsed = rawPatterns as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('goalie-gauntlet-patterns.json must export an array');
  }

  const patterns = parsed.filter(validatePattern);
  if (patterns.length < 4) {
    throw new Error(`goalie-gauntlet-patterns.json requires at least 4 valid patterns. Found ${patterns.length}`);
  }

  const ids = new Set<string>();
  for (let i = 0; i < patterns.length; i += 1) {
    if (ids.has(patterns[i].id)) {
      throw new Error(`Duplicate pattern id: ${patterns[i].id}`);
    }
    ids.add(patterns[i].id);
  }

  return { patterns };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function difficultyScale(difficulty: GoalieDifficulty): { speed: number; cadence: number; window: number } {
  if (difficulty === 'hard') return { speed: 1.2, cadence: 0.82, window: 0.82 };
  if (difficulty === 'medium') return { speed: 1.08, cadence: 0.92, window: 0.92 };
  return { speed: 0.96, cadence: 1.04, window: 1 };
}

function neighboringZone(zone: GoalieZone): GoalieZone {
  if (zone.endsWith('left')) return zone.replace('left', 'right') as GoalieZone;
  return zone.replace('right', 'left') as GoalieZone;
}

function adjacentZones(zone: GoalieZone): readonly GoalieZone[] {
  if (zone.startsWith('high')) return [zone.replace('high', 'mid') as GoalieZone, neighboringZone(zone)];
  if (zone.startsWith('mid')) return [zone.replace('mid', 'high') as GoalieZone, zone.replace('mid', 'low') as GoalieZone];
  return [zone.replace('low', 'mid') as GoalieZone, neighboringZone(zone)];
}

export interface ShotScheduleOptions {
  seed: number | string;
  mode: GoalieMode;
  difficulty: GoalieDifficulty;
  patternId?: string;
  shotCount?: number;
  durationMs?: number;
}

export interface ShotSchedule {
  patternId: string;
  shots: ScheduledShot[];
  timingScale: number;
}

export function buildShotSchedule(catalog: ShotPatternCatalog, options: ShotScheduleOptions): ShotSchedule {
  const rng = createSeededRng(`${options.seed}:${options.mode}:${options.difficulty}:${options.patternId ?? 'auto'}`);
  const difficulty = difficultyScale(options.difficulty);

  const pattern = options.patternId
    ? catalog.patterns.find((entry) => entry.id === options.patternId) ?? catalog.patterns[0]
    : catalog.patterns[rng.nextInt(catalog.patterns.length)];

  const byDuration = typeof options.durationMs === 'number' ? Math.max(10, Math.floor(options.durationMs / 900)) : 0;
  const targetShots = options.shotCount ?? (byDuration || (options.mode === 'time_attack' ? 70 : 120));

  const shots: ScheduledShot[] = [];
  let shotIndex = 0;
  let cursorMs = 350;
  let sequenceIndex = 0;

  while (shots.length < targetShots) {
    const template = pattern.shots[shotIndex % pattern.shots.length];
    const levelBoost = 1 + shotIndex * 0.008;
    const speed = Math.round(template.speed * difficulty.speed * clamp(levelBoost, 1, 1.6));
    const telegraphLeadMs = clamp(Math.round((320 - shotIndex * 1.1) * difficulty.window), 130, 340);
    const travelMs = clamp(Math.round(1500 - speed * 1.28), 340, 980);

    const fake = template.fake === true;
    const telegraphZone = template.zone;
    const realZone = template.realZone ?? (fake ? neighboringZone(template.zone) : template.zone);

    const primaryShot: ScheduledShot = {
      id: shots.length,
      patternId: pattern.id,
      sequenceIndex: sequenceIndex++,
      roundIndex: 0,
      zone: realZone,
      telegraphZone,
      realZone,
      telegraph: template.telegraph,
      type: template.type ?? 'straight',
      speed,
      fake,
      fakeShiftAtMs: fake ? template.fakeShiftAtMs ?? clamp(160 + rng.nextInt(170), 120, 360) : null,
      deflection: template.deflection === true && rng.next() > 0.35,
      spin: template.spin === true && rng.next() > 0.3,
      rebound: false,
      reboundSpeedMultiplier: 1,
      reboundParentShotId: null,
      scoreMultiplier: 1,
      telegraphAtMs: cursorMs,
      spawnAtMs: cursorMs + telegraphLeadMs,
      arriveAtMs: cursorMs + telegraphLeadMs + travelMs
    };
    shots.push(primaryShot);

    const shouldRebound = template.rebound === true && rng.next() > 0.5;
    if (shouldRebound && shots.length < targetShots) {
      const reboundGapMs = 300 + rng.nextInt(301);
      const reboundSpeedMultiplier = clamp(template.reboundSpeedMultiplier ?? (1.1 + rng.next() * 0.25), 1.02, 1.9);
      const reboundTravelMs = clamp(Math.round(travelMs / reboundSpeedMultiplier), 280, 760);
      const reboundTelegraphLeadMs = clamp(Math.round(165 / reboundSpeedMultiplier), 90, 220);
      const reboundChoices = adjacentZones(realZone);
      const reboundZone = reboundChoices[rng.nextInt(reboundChoices.length)];
      const reboundSpawnAt = primaryShot.arriveAtMs + reboundGapMs;

      shots.push({
        id: shots.length,
        patternId: pattern.id,
        sequenceIndex: sequenceIndex++,
        roundIndex: 0,
        zone: reboundZone,
        telegraphZone: reboundZone,
        realZone: reboundZone,
        telegraph: 'glow',
        type: template.type ?? 'straight',
        speed: Math.round(speed * reboundSpeedMultiplier),
        fake: false,
        fakeShiftAtMs: null,
        deflection: true,
        spin: template.spin === true,
        rebound: true,
        reboundSpeedMultiplier,
        reboundParentShotId: primaryShot.id,
        scoreMultiplier: clamp(1.12 + (reboundSpeedMultiplier - 1) * 0.55, 1.1, 1.65),
        telegraphAtMs: Math.max(primaryShot.arriveAtMs + 35, reboundSpawnAt - reboundTelegraphLeadMs),
        spawnAtMs: reboundSpawnAt,
        arriveAtMs: reboundSpawnAt + reboundTravelMs
      });
    }

    const comboGap = template.comboGapMs ?? clamp(Math.round((520 - shotIndex * 1.35) * difficulty.cadence), 150, 720);
    cursorMs += comboGap;
    shotIndex += 1;

    if (typeof options.durationMs === 'number' && cursorMs > options.durationMs + 800) {
      break;
    }
  }

  return {
    patternId: pattern.id,
    shots,
    timingScale: difficulty.window
  };
}
