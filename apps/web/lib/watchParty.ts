export const PARTY_LAUNCH_MODES = ["STANDARD", "COMMENTARY"] as const;

export type PartyLaunchMode = (typeof PARTY_LAUNCH_MODES)[number];

type WatchPartyLinkInput = {
  showSlug: string;
  episodeId?: string | null;
  partyMode?: PartyLaunchMode | null;
};

function buildQuery(params: Record<string, string | undefined | null>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (!value) continue;
    query.set(key, value);
  }
  const serialized = query.toString();
  return serialized.length > 0 ? `?${serialized}` : "";
}

export function buildWatchPartyLaunchHref(input: WatchPartyLinkInput) {
  return `/party/create${buildQuery({
    source: "watch",
    show: input.showSlug,
    episodeId: input.episodeId,
    partyMode: input.partyMode ?? undefined
  })}`;
}

export function buildEpisodePartyRoomName(title: string, mode: PartyLaunchMode) {
  return mode === "COMMENTARY" ? `${title} Commentary Party` : `${title} Watch Party`;
}

export function getPartyLaunchModeLabel(mode: PartyLaunchMode) {
  return mode === "COMMENTARY" ? "Commentary" : "Standard";
}
