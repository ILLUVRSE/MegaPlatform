type GamesTelemetryTrackPayload = {
  eventType: "catalog_view" | "game_open" | "game_open_direct" | "embed_loaded" | "creator_publish" |
    "games.catalog.view" | "games.open" | "games.open.direct" | "game.embed.load" | "game.publish";
  gameId: string;
  actorId?: string;
  surface?: "games_home" | "games_catalog" | "games_detail" | "games_embed" | "games_create";
  gameSlug?: string | null;
  templateId?: string | null;
  href?: string | null;
};

const GAMES_ACTOR_STORAGE_KEY = "illuvrse.games.actorId";

function resolveGamesActorId() {
  if (typeof window === "undefined") return "server";

  const existing = window.localStorage.getItem(GAMES_ACTOR_STORAGE_KEY);
  if (existing) return existing;

  const actorId = `anon_${crypto.randomUUID()}`;
  window.localStorage.setItem(GAMES_ACTOR_STORAGE_KEY, actorId);
  return actorId;
}

export async function trackGameEvent(payload: GamesTelemetryTrackPayload) {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({
    ...payload,
    actorId: payload.actorId ?? resolveGamesActorId(),
    timestamp: new Date().toISOString()
  });

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const ok = navigator.sendBeacon("/api/games/telemetry", new Blob([body], { type: "application/json" }));
      if (ok) return;
    }
  } catch {
    // best effort analytics only
  }

  try {
    await fetch("/api/games/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true
    });
  } catch {
    // best effort analytics only
  }
}
