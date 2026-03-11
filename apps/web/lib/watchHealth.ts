type ChannelHealthInput = {
  isActive: boolean;
  streamUrl: string | null;
  lastCheckedAt: Date | null;
  lastHealthyAt: Date | null;
};

export function computeLiveChannelHealth(input: ChannelHealthInput) {
  if (!input.isActive) {
    return { status: "inactive" as const, isHealthy: false, staleMinutes: null };
  }

  if (!input.streamUrl) {
    return { status: "offline" as const, isHealthy: false, staleMinutes: null };
  }

  if (!input.lastCheckedAt) {
    return { status: "unknown" as const, isHealthy: true, staleMinutes: null };
  }

  const reference = input.lastHealthyAt ?? input.lastCheckedAt;
  const staleMinutes = Math.max(0, Math.floor((Date.now() - reference.getTime()) / 60_000));
  if (staleMinutes >= 15) {
    return { status: "degraded" as const, isHealthy: false, staleMinutes };
  }

  return { status: "healthy" as const, isHealthy: true, staleMinutes };
}
