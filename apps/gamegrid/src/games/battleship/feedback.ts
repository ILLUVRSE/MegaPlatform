export interface ImpactPulse {
  side: 'player' | 'enemy';
  row: number;
  col: number;
  hit: boolean;
  lifeMs: number;
}

export function nextHitStreak(current: number, hit: boolean): number {
  if (!hit) return 0;
  return current + 1;
}

export function pushImpact(queue: ImpactPulse[], impact: ImpactPulse, maxSize = 24): void {
  queue.push(impact);
  if (queue.length > maxSize) queue.shift();
}

export function tickImpacts(queue: ImpactPulse[], deltaMs: number): void {
  let write = 0;
  for (let i = 0; i < queue.length; i += 1) {
    const item = queue[i];
    const nextLife = item.lifeMs - deltaMs;
    if (nextLife <= 0) continue;
    item.lifeMs = nextLife;
    queue[write] = item;
    write += 1;
  }
  queue.length = write;
}
