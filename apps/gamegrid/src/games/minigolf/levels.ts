import holesRaw from '../../content/minigolf-holes.json';
import { isWaterAt } from './surfaces';
import type {
  Bumper,
  MinigolfCourse,
  MinigolfHole,
  MinigolfTheme,
  MovingObstacle,
  Segment,
  SlopeZone,
  SurfaceZone,
  Vec2,
  WaterHazard
} from './types';

const THEMES: readonly MinigolfTheme[] = ['classic', 'neon', 'backyard'] as const;

function isPoint(value: unknown): value is Vec2 {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  return typeof rec.x === 'number' && typeof rec.y === 'number';
}

function isSegment(value: unknown): value is Segment {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  return (
    typeof rec.x1 === 'number' &&
    typeof rec.y1 === 'number' &&
    typeof rec.x2 === 'number' &&
    typeof rec.y2 === 'number'
  );
}

function isBumper(value: unknown): value is Bumper {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  if (rec.kind === 'circle') {
    return typeof rec.x === 'number' && typeof rec.y === 'number' && typeof rec.radius === 'number';
  }
  if (rec.kind === 'rect') {
    return (
      typeof rec.x === 'number' &&
      typeof rec.y === 'number' &&
      typeof rec.width === 'number' &&
      typeof rec.height === 'number'
    );
  }
  return false;
}

function isWaterHazard(value: unknown): value is WaterHazard {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  if (rec.kind === 'rect') {
    return (
      typeof rec.x === 'number' &&
      typeof rec.y === 'number' &&
      typeof rec.width === 'number' &&
      typeof rec.height === 'number'
    );
  }
  if (rec.kind === 'polygon') {
    return Array.isArray(rec.points) && rec.points.every(isPoint) && rec.points.length >= 3;
  }
  return false;
}

function isSurfaceZone(value: unknown): value is SurfaceZone {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  return (
    rec.kind === 'rect' &&
    typeof rec.x === 'number' &&
    typeof rec.y === 'number' &&
    typeof rec.width === 'number' &&
    typeof rec.height === 'number' &&
    (rec.material === 'normal' || rec.material === 'sand' || rec.material === 'ice')
  );
}

function isSlopeZone(value: unknown): value is SlopeZone {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  return (
    rec.kind === 'rect' &&
    typeof rec.x === 'number' &&
    typeof rec.y === 'number' &&
    typeof rec.width === 'number' &&
    typeof rec.height === 'number' &&
    typeof rec.forceX === 'number' &&
    typeof rec.forceY === 'number' &&
    (rec.sampleCols === undefined || typeof rec.sampleCols === 'number') &&
    (rec.sampleRows === undefined || typeof rec.sampleRows === 'number') &&
    (rec.sampleForces === undefined || (Array.isArray(rec.sampleForces) && rec.sampleForces.every((entry) => typeof entry === 'number')))
  );
}

function isMovingObstacle(value: unknown): value is MovingObstacle {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  return (
    typeof rec.id === 'string' &&
    rec.kind === 'rect' &&
    typeof rec.x === 'number' &&
    typeof rec.y === 'number' &&
    typeof rec.width === 'number' &&
    typeof rec.height === 'number' &&
    (rec.axis === 'x' || rec.axis === 'y') &&
    typeof rec.range === 'number' &&
    typeof rec.speed === 'number' &&
    typeof rec.phase === 'number'
  );
}

function isTheme(value: unknown): value is MinigolfTheme {
  return value === 'classic' || value === 'neon' || value === 'backyard';
}

function isHole(value: unknown): value is MinigolfHole {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  const bounds = rec.bounds as Record<string, unknown>;
  const cup = rec.cup as Record<string, unknown>;
  const hazards = rec.hazards as Record<string, unknown>;

  return (
    typeof rec.id === 'string' &&
    typeof rec.name === 'string' &&
    isTheme(rec.theme) &&
    typeof rec.par === 'number' &&
    typeof bounds?.x === 'number' &&
    typeof bounds?.y === 'number' &&
    typeof bounds?.width === 'number' &&
    typeof bounds?.height === 'number' &&
    isPoint(rec.start) &&
    typeof cup?.x === 'number' &&
    typeof cup?.y === 'number' &&
    typeof cup?.radius === 'number' &&
    Array.isArray(rec.walls) &&
    rec.walls.every(isSegment) &&
    Array.isArray(rec.bumpers) &&
    rec.bumpers.every(isBumper) &&
    Array.isArray(hazards?.water) &&
    hazards.water.every(isWaterHazard) &&
    Array.isArray(hazards?.surfaces) &&
    hazards.surfaces.every(isSurfaceZone) &&
    Array.isArray(hazards?.slopes) &&
    hazards.slopes.every(isSlopeZone) &&
    Array.isArray(rec.movingObstacles) &&
    rec.movingObstacles.every(isMovingObstacle)
  );
}

function pointInBounds(x: number, y: number, hole: MinigolfHole): boolean {
  return x >= hole.bounds.x && x <= hole.bounds.x + hole.bounds.width && y >= hole.bounds.y && y <= hole.bounds.y + hole.bounds.height;
}

function distanceToSegmentSq(x: number, y: number, segment: Segment): number {
  const abx = segment.x2 - segment.x1;
  const aby = segment.y2 - segment.y1;
  const apx = x - segment.x1;
  const apy = y - segment.y1;
  const abLenSq = abx * abx + aby * aby;
  const t = abLenSq > 1e-6 ? Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq)) : 0;
  const cx = segment.x1 + abx * t;
  const cy = segment.y1 + aby * t;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy;
}

function isNearWall(x: number, y: number, hole: MinigolfHole, threshold: number): boolean {
  const thresholdSq = threshold * threshold;
  for (let i = 0; i < hole.walls.length; i += 1) {
    if (distanceToSegmentSq(x, y, hole.walls[i]) <= thresholdSq) {
      return true;
    }
  }
  return false;
}

function validateWalls(hole: MinigolfHole) {
  for (let i = 0; i < hole.walls.length; i += 1) {
    const wall = hole.walls[i];
    if (!pointInBounds(wall.x1, wall.y1, hole) || !pointInBounds(wall.x2, wall.y2, hole)) {
      throw new Error(`Wall endpoint out of bounds in hole ${hole.id}`);
    }
    if (Math.abs(wall.x1 - wall.x2) + Math.abs(wall.y1 - wall.y2) < 1) {
      throw new Error(`Degenerate wall in hole ${hole.id}`);
    }
  }
}

function validateSlopeSampleField(hole: MinigolfHole) {
  for (let i = 0; i < hole.hazards.slopes.length; i += 1) {
    const slope = hole.hazards.slopes[i];
    const hasField = slope.sampleCols !== undefined || slope.sampleRows !== undefined || slope.sampleForces !== undefined;
    if (!hasField) continue;
    if (!slope.sampleCols || !slope.sampleRows || !Array.isArray(slope.sampleForces)) {
      throw new Error(`Incomplete slope sample field in hole ${hole.id}`);
    }
    if (slope.sampleCols < 2 || slope.sampleRows < 2) {
      throw new Error(`Slope sample field must be at least 2x2 in hole ${hole.id}`);
    }
    if (slope.sampleForces.length !== slope.sampleCols * slope.sampleRows * 2) {
      throw new Error(`Slope sample field size mismatch in hole ${hole.id}`);
    }
  }
}

function validateCupStart(hole: MinigolfHole) {
  if (!pointInBounds(hole.start.x, hole.start.y, hole)) {
    throw new Error(`Start point out of bounds in hole ${hole.id}`);
  }
  if (!pointInBounds(hole.cup.x, hole.cup.y, hole)) {
    throw new Error(`Cup point out of bounds in hole ${hole.id}`);
  }
  if (isWaterAt(hole, hole.cup.x, hole.cup.y)) {
    throw new Error(`Cup is inside water hazard in hole ${hole.id}`);
  }
  if (isNearWall(hole.cup.x, hole.cup.y, hole, hole.cup.radius * 0.75)) {
    throw new Error(`Cup intersects wall clearance in hole ${hole.id}`);
  }
}

function isBlockedCell(x: number, y: number, hole: MinigolfHole): boolean {
  if (!pointInBounds(x, y, hole)) return true;
  if (isWaterAt(hole, x, y)) return true;
  if (isNearWall(x, y, hole, 8)) return true;
  return false;
}

function ensureReachable(hole: MinigolfHole) {
  const cell = 24;
  const cols = Math.max(2, Math.ceil(hole.bounds.width / cell));
  const rows = Math.max(2, Math.ceil(hole.bounds.height / cell));
  const startCol = Math.max(0, Math.min(cols - 1, Math.floor((hole.start.x - hole.bounds.x) / cell)));
  const startRow = Math.max(0, Math.min(rows - 1, Math.floor((hole.start.y - hole.bounds.y) / cell)));
  const targetCol = Math.max(0, Math.min(cols - 1, Math.floor((hole.cup.x - hole.bounds.x) / cell)));
  const targetRow = Math.max(0, Math.min(rows - 1, Math.floor((hole.cup.y - hole.bounds.y) / cell)));

  const visited = new Uint8Array(cols * rows);
  const queue: Array<{ c: number; r: number }> = [{ c: startCol, r: startRow }];
  visited[startRow * cols + startCol] = 1;

  const deltas: Array<[number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];

  for (let i = 0; i < queue.length; i += 1) {
    const node = queue[i];
    if (node.c === targetCol && node.r === targetRow) return;
    for (let d = 0; d < deltas.length; d += 1) {
      const nc = node.c + deltas[d][0];
      const nr = node.r + deltas[d][1];
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const idx = nr * cols + nc;
      if (visited[idx]) continue;
      const px = hole.bounds.x + nc * cell + cell * 0.5;
      const py = hole.bounds.y + nr * cell + cell * 0.5;
      if (isBlockedCell(px, py, hole)) continue;
      visited[idx] = 1;
      queue.push({ c: nc, r: nr });
    }
  }

  throw new Error(`Cup is not reachable in hole ${hole.id}`);
}

export function loadMinigolfCourse(): MinigolfCourse {
  const holesData = holesRaw as unknown;
  if (!Array.isArray(holesData)) {
    throw new Error('minigolf-holes.json must export an array');
  }

  const holes = holesData.filter(isHole);
  if (holes.length !== 18) {
    throw new Error(`Minigolf requires exactly 18 valid holes. Found ${holes.length}.`);
  }

  const idSet = new Set<string>();
  for (let i = 0; i < holes.length; i += 1) {
    const hole = holes[i];
    if (idSet.has(hole.id)) {
      throw new Error(`Duplicate hole id: ${hole.id}`);
    }
    idSet.add(hole.id);
  }

  for (let i = 0; i < THEMES.length; i += 1) {
    const theme = THEMES[i];
    const count = holes.filter((hole) => hole.theme === theme).length;
    if (count !== 6) {
      throw new Error(`Expected 6 holes for theme ${theme}. Found ${count}.`);
    }
  }

  for (let i = 0; i < holes.length; i += 1) {
    const hole = holes[i];
    validateWalls(hole);
    validateSlopeSampleField(hole);
    validateCupStart(hole);
    ensureReachable(hole);
  }

  return { holes };
}

export function getHoleById(id: string): MinigolfHole {
  const hole = loadMinigolfCourse().holes.find((entry) => entry.id === id);
  if (!hole) {
    throw new Error(`Unknown minigolf hole id: ${id}`);
  }
  return hole;
}
