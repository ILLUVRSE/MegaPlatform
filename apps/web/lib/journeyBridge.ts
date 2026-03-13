import { buildWatchPartyLaunchHref, type PartyLaunchMode } from "@/lib/watchParty";

type WatchBridgeInput = {
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

export function buildWatchToPartyHref(input: WatchBridgeInput) {
  return buildWatchPartyLaunchHref(input);
}

export function buildWatchToStudioHref(input: WatchBridgeInput) {
  return `/studio${buildQuery({ source: "watch", show: input.showSlug, episodeId: input.episodeId })}`;
}

export function buildPartyToStudioHref(partyCode?: string | null) {
  return `/studio${buildQuery({ source: "party", partyCode: partyCode ?? undefined })}`;
}

export function summarizeJourneyContext(input: { source?: string; show?: string; episodeId?: string; partyCode?: string }) {
  if (input.source === "watch") {
    return {
      source: "watch",
      label: `From Watch${input.show ? `: ${input.show}` : ""}${input.episodeId ? ` (episode ${input.episodeId.slice(0, 8)})` : ""}`
    };
  }
  if (input.source === "party") {
    return {
      source: "party",
      label: `From Party${input.partyCode ? `: ${input.partyCode}` : ""}`
    };
  }
  return null;
}
