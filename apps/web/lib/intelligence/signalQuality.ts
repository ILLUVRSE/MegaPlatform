export type RawSignal = {
  actorKey: string;
  eventType: string;
  createdAt: Date;
};

export function filterLowQualitySignals(signals: RawSignal[]) {
  const seen = new Set<string>();
  const deduped: RawSignal[] = [];

  for (const signal of signals) {
    const bucket = Math.floor(signal.createdAt.getTime() / 5000);
    const key = `${signal.actorKey}:${signal.eventType}:${bucket}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(signal);
  }

  return deduped;
}
