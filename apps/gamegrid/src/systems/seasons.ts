const SEASON_LENGTH_DAYS = 60;
const SEASON_EPOCH = Date.UTC(2026, 0, 1);

export function isoDay(timestamp = Date.now()): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function getSeasonForDate(timestamp = Date.now()): { seasonId: string; index: number; startIso: string } {
  const daysSinceEpoch = Math.floor((timestamp - SEASON_EPOCH) / 86_400_000);
  const index = Math.max(0, Math.floor(daysSinceEpoch / SEASON_LENGTH_DAYS));
  const startMs = SEASON_EPOCH + index * SEASON_LENGTH_DAYS * 86_400_000;
  const startIso = new Date(startMs).toISOString().slice(0, 10);
  const seasonId = `S${String(index + 1).padStart(2, '0')}-${startIso}`;
  return { seasonId, index, startIso };
}
