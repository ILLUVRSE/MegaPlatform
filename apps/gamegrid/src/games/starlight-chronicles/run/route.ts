import type { UniverseDefinition } from '../world/universe';

export interface RouteProgress {
  path: string[];
  index: number;
}

export function buildRoute(universe: UniverseDefinition, originId: string, targetId: string): string[] {
  if (originId === targetId) return [originId];

  const queue: string[] = [originId];
  const visited = new Set<string>([originId]);
  const parent = new Map<string, string>();

  while (queue.length > 0) {
    const current = queue.shift() as string;
    const system = universe.systems.find((entry) => entry.id === current);
    if (!system) continue;

    const neighbors = [...system.neighbors].sort();
    for (let i = 0; i < neighbors.length; i += 1) {
      const next = neighbors[i];
      if (visited.has(next)) continue;
      visited.add(next);
      parent.set(next, current);
      if (next === targetId) {
        const path = [targetId];
        let cursor = targetId;
        while (parent.has(cursor)) {
          cursor = parent.get(cursor) as string;
          path.push(cursor);
          if (cursor === originId) break;
        }
        return path.reverse();
      }
      queue.push(next);
    }
  }

  return [originId];
}

export function advanceRoute(progress: RouteProgress): RouteProgress {
  if (progress.path.length <= 1) return progress;
  return {
    ...progress,
    index: Math.min(progress.path.length - 1, progress.index + 1)
  };
}

export function currentRouteSystem(progress: RouteProgress): string {
  return progress.path[Math.max(0, Math.min(progress.index, progress.path.length - 1))] ?? '';
}

export function isRouteComplete(progress: RouteProgress): boolean {
  return progress.path.length <= 1 || progress.index >= progress.path.length - 1;
}
