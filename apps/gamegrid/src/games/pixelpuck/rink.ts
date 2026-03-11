import rinkRaw from '../../content/pixelpuck-rinks.json';
import type { RinkGeometry, RinkObstacle } from './types';

function isObstacle(value: unknown): value is RinkObstacle {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  if (data.kind === 'circle') {
    return typeof data.x === 'number' && typeof data.y === 'number' && typeof data.radius === 'number';
  }
  if (data.kind === 'rect') {
    return (
      typeof data.x === 'number' &&
      typeof data.y === 'number' &&
      typeof data.width === 'number' &&
      typeof data.height === 'number'
    );
  }
  return false;
}

function isRinkGeometry(value: unknown): value is RinkGeometry {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  const bounds = data.bounds as Record<string, unknown>;
  const goals = data.goals as Record<string, unknown>;
  const top = goals?.top as Record<string, unknown>;
  const bottom = goals?.bottom as Record<string, unknown>;
  const obstacles = data.obstacles;

  return (
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    typeof bounds?.x === 'number' &&
    typeof bounds?.y === 'number' &&
    typeof bounds?.width === 'number' &&
    typeof bounds?.height === 'number' &&
    typeof top?.x === 'number' &&
    typeof top?.width === 'number' &&
    typeof top?.lineY === 'number' &&
    typeof bottom?.x === 'number' &&
    typeof bottom?.width === 'number' &&
    typeof bottom?.lineY === 'number' &&
    Array.isArray(obstacles) &&
    obstacles.every(isObstacle)
  );
}

export function loadRinks(): RinkGeometry[] {
  if (!Array.isArray(rinkRaw)) {
    throw new Error('pixelpuck-rinks.json must export an array');
  }

  const parsed = rinkRaw.filter(isRinkGeometry);
  if (parsed.length < 3) {
    throw new Error('Expected at least 3 valid rink variants');
  }

  return parsed;
}

export function getRinkById(id: string): RinkGeometry {
  const rink = loadRinks().find((item) => item.id === id);
  if (!rink) {
    throw new Error(`Unknown rink variant: ${id}`);
  }
  return rink;
}
