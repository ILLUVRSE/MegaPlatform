export type PlatformRangeKey = "24h" | "7d" | "30d";

export const PLATFORM_RANGE_OPTIONS: Array<{ key: PlatformRangeKey; label: string }> = [
  { key: "24h", label: "Last 24 Hours" },
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" }
];

export function resolvePlatformRange(value: string | undefined): PlatformRangeKey {
  if (value === "24h" || value === "30d") return value;
  return "7d";
}

export function getRangeSince(range: PlatformRangeKey, now = new Date()): Date {
  const durationMs =
    range === "24h" ? 24 * 60 * 60 * 1000 : range === "30d" ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  return new Date(now.getTime() - durationMs);
}

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toDayLabel(dayKey: string): string {
  return dayKey.slice(5);
}

export function buildDailyTrend(
  rows: Array<{ day: Date | string; count: bigint | number }>,
  since: Date,
  now = new Date()
): Array<{ dayKey: string; label: string; count: number }> {
  const normalized = new Map<string, number>();
  rows.forEach((row) => {
    const day = row.day instanceof Date ? row.day : new Date(row.day);
    normalized.set(toDayKey(day), Number(row.count));
  });

  const cursor = new Date(since);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);

  const trend: Array<{ dayKey: string; label: string; count: number }> = [];
  while (cursor <= end) {
    const dayKey = toDayKey(cursor);
    trend.push({
      dayKey,
      label: toDayLabel(dayKey),
      count: normalized.get(dayKey) ?? 0
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return trend;
}
