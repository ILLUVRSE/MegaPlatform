export function normalize(value: number, min: number, max: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
  if (max <= min) return 0;
  const normalized = (value - min) / (max - min);
  return Math.max(0, Math.min(1, normalized));
}

export function dateDiffDays(date: Date, base: Date): number {
  const ms = base.getTime() - date.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function startOfDay(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function formatYear(date?: Date | null): string {
  if (!date) return 'TBA';
  return String(date.getUTCFullYear());
}
