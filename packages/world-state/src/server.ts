/**
 * Redis-backed world-state helpers for party sessions.
 * Request/response: internal library functions return plain objects and booleans.
 * Guard: server-side only; requires REDIS_URL and network access to Redis.
 */
import Redis from "ioredis";

export type SeatState = "available" | "reserved" | "locked" | "occupied";
export type PlaybackState = "idle" | "playing" | "paused";

export type SeatUpdatePayload = {
  type: "seat_update";
  seatIndex: number;
  state: SeatState;
  userId?: string | null;
};

export type PlaybackUpdatePayload = {
  type: "playback_update";
  leaderTime: number;
  playbackPositionMs: number;
  currentIndex: number;
  playbackState: PlaybackState;
  leaderId: string;
};

export type PlaylistUpdatePayload = {
  type: "playlist_update";
  playlistLength: number;
  updatedAt: string;
};

export type PresenceUpdatePayload = {
  type: "presence_update";
  userId: string;
  displayName?: string | null;
  lastSeenAt?: string;
  seatIndex?: number | null;
  status: "joined" | "left" | "updated";
};

export type KeepalivePayload = {
  type: "keepalive";
  ts: string;
  lastSeenAt?: string | null;
  lastHostHeartbeatAt?: string | null;
  pingCount: number;
};

export type SnapshotPayload = {
  type: "snapshot";
  state: PartyState;
  reason: "initial" | "reconnect" | "heartbeat";
};

export type PartyEventPayload =
  | SeatUpdatePayload
  | PlaybackUpdatePayload
  | PlaylistUpdatePayload
  | PresenceUpdatePayload
  | KeepalivePayload
  | SnapshotPayload;

export type PartySeatSnapshot = {
  state: SeatState;
  userId?: string | null;
};

export type PartyPlaybackSnapshot = {
  currentIndex: number;
  playbackState: PlaybackState;
  leaderTime?: number;
  playbackPositionMs?: number;
  leaderId?: string | null;
};

export type PartyPresenceSnapshot = {
  displayName?: string | null;
  joinedAt: string;
  lastSeenAt?: string;
  seatIndex?: number | null;
};

export type PartyHeartbeatSnapshot = {
  lastSeenAt: string | null;
  lastHostHeartbeatAt: string | null;
  pingCount: number;
};

export type PartyState = {
  partyId: string;
  seatCount: number;
  seats: Record<string, PartySeatSnapshot>;
  playback: PartyPlaybackSnapshot;
  participants: Record<string, PartyPresenceSnapshot>;
  heartbeat: PartyHeartbeatSnapshot;
  updatedAt: string;
};

export type MinigamePartyPhase =
  | "LOBBY"
  | "COUNTDOWN"
  | "PLAYING"
  | "INTERMISSION"
  | "SESSION_END";

export type MinigamePartyPlayer = {
  id: string;
  name: string;
  role: "player" | "spectator";
  nextRole?: "player" | "spectator" | null;
  isReady: boolean;
  isConnected: boolean;
  joinedAt: string;
  lastSeenAt: string;
};

export type MinigamePartyRound = {
  index: number;
  seed: string;
  spec: unknown;
  startAt: number;
  endAt: number;
};

export type MinigamePartyConfig = {
  roundsTotal: number;
  minPlayersToStart: number;
  readyTimeoutMs: number;
  intermissionMs: number;
};

export type MinigamePartyRoundResult = {
  playerId: string;
  rawScore: number;
  placement: number;
  pointsAwarded: number;
  win: boolean;
  completionTimeSeconds?: number | null;
};

export type MinigamePartyScoreboard = {
  partyPointsByPlayerId: Record<string, number>;
  lastRoundResults: MinigamePartyRoundResult[];
  history?: MinigamePartyRoundResult[][];
};

export type MinigamePartyLocks = {
  lockedRosterDuringRound: boolean;
};

export type MinigamePartyState = {
  code: string;
  hostId: string;
  phase: MinigamePartyPhase;
  players: Record<string, MinigamePartyPlayer>;
  currentRound: MinigamePartyRound | null;
  config: MinigamePartyConfig;
  scoreboard: MinigamePartyScoreboard;
  locks: MinigamePartyLocks;
  readyCheckStartedAt?: number | null;
  intermissionEndsAt?: number | null;
  updatedAt: string;
};

export type MinigamePartyEvent =
  | { type: "room_state"; state: MinigamePartyState }
  | { type: "round_countdown"; startAt: number; roundIndex: number }
  | { type: "round_start"; seed: string; spec: unknown; startAt: number; endAt: number; roundIndex: number }
  | {
      type: "snapshot";
      t: number;
      playerId: string;
      state: unknown;
      hud: unknown;
      scores: Record<string, number>;
    }
  | { type: "round_end"; results: MinigamePartyRoundResult[]; scores: Record<string, number> }
  | { type: "intermission"; endsAt: number }
  | { type: "session_end"; scores: Record<string, number> }
  | { type: "error"; message: string };

const DEFAULT_REDIS_URL = "redis://localhost:6379";

let sharedClient: Redis | null = null;

function getRedisClient() {
  if (!sharedClient) {
    sharedClient = new Redis(process.env.REDIS_URL ?? DEFAULT_REDIS_URL, {
      maxRetriesPerRequest: 2
    });
  }
  return sharedClient;
}

export function setRedisClient(client: Redis) {
  sharedClient = client;
}

export function getStateKey(partyId: string) {
  return `illuvrse:party:${partyId}:state`;
}

export function getPubChannel(partyId: string) {
  return `illuvrse:party:${partyId}:pub`;
}

export function getMinigamePartyStateKey(code: string) {
  return `illuvrse:minigame-party:${code}:state`;
}

export function getMinigamePartyPubChannel(code: string) {
  return `illuvrse:minigame-party:${code}:pub`;
}

export function getReservationKey(partyId: string, seatIndex: number) {
  return `illuvrse:party:${partyId}:seat:${seatIndex}:reservation`;
}

export async function getState(partyId: string, seatCount: number): Promise<PartyState> {
  const redis = getRedisClient();
  const raw = await redis.get(getStateKey(partyId));
  const parsed = raw ? (JSON.parse(raw) as PartyState) : null;
  const state: PartyState = parsed ?? {
    partyId,
    seatCount,
    seats: {},
    playback: {
      currentIndex: 0,
      playbackState: "idle"
    },
    participants: {},
    heartbeat: {
      lastSeenAt: null,
      lastHostHeartbeatAt: null,
      pingCount: 0
    },
    updatedAt: new Date().toISOString()
  };

  state.seatCount = seatCount;
  state.heartbeat = {
    lastSeenAt: state.heartbeat?.lastSeenAt ?? null,
    lastHostHeartbeatAt: state.heartbeat?.lastHostHeartbeatAt ?? null,
    pingCount: state.heartbeat?.pingCount ?? 0
  };
  await syncReservationState(redis, state);
  return state;
}

export async function setState(partyId: string, state: PartyState) {
  const redis = getRedisClient();
  state.updatedAt = new Date().toISOString();
  await redis.set(getStateKey(partyId), JSON.stringify(state));
}

export async function publish(partyId: string, payload: PartyEventPayload) {
  const redis = getRedisClient();
  await redis.publish(getPubChannel(partyId), JSON.stringify(payload));
}

export async function subscribe(
  partyId: string,
  handler: (payload: PartyEventPayload) => void
) {
  const redis = new Redis(process.env.REDIS_URL ?? DEFAULT_REDIS_URL, {
    maxRetriesPerRequest: 2
  });
  const channel = getPubChannel(partyId);

  const onMessage = (receivedChannel: string, message: string) => {
    if (receivedChannel !== channel) return;
    try {
      handler(JSON.parse(message) as PartyEventPayload);
    } catch {
      // ignore malformed payloads
    }
  };

  redis.on("message", onMessage);
  await redis.subscribe(channel);

  return async () => {
    redis.off("message", onMessage);
    await redis.unsubscribe(channel);
    redis.disconnect();
  };
}

export async function getMinigamePartyState(code: string): Promise<MinigamePartyState | null> {
  const redis = getRedisClient();
  const raw = await redis.get(getMinigamePartyStateKey(code));
  if (!raw) return null;
  return JSON.parse(raw) as MinigamePartyState;
}

export async function setMinigamePartyState(code: string, state: MinigamePartyState) {
  const redis = getRedisClient();
  state.updatedAt = new Date().toISOString();
  await redis.set(getMinigamePartyStateKey(code), JSON.stringify(state));
}

export async function publishMinigamePartyEvent(code: string, payload: MinigamePartyEvent) {
  const redis = getRedisClient();
  await redis.publish(getMinigamePartyPubChannel(code), JSON.stringify(payload));
}

export async function subscribeMinigameParty(
  code: string,
  handler: (payload: MinigamePartyEvent) => void
) {
  const redis = new Redis(process.env.REDIS_URL ?? DEFAULT_REDIS_URL, {
    maxRetriesPerRequest: 2
  });
  const channel = getMinigamePartyPubChannel(code);

  const onMessage = (receivedChannel: string, message: string) => {
    if (receivedChannel !== channel) return;
    try {
      handler(JSON.parse(message) as MinigamePartyEvent);
    } catch {
      // ignore malformed payloads
    }
  };

  redis.on("message", onMessage);
  await redis.subscribe(channel);

  return async () => {
    redis.off("message", onMessage);
    await redis.unsubscribe(channel);
    redis.disconnect();
  };
}

export async function reserveSeat(
  partyId: string,
  seatIndex: number,
  userId: string,
  ttlMs: number,
  seatCount: number
) {
  const redis = getRedisClient();
  const key = getReservationKey(partyId, seatIndex);
  const result = await redis.set(key, userId, "PX", ttlMs, "NX");

  if (!result) {
    const current = await redis.get(key);
    if (current === userId) {
      await redis.pexpire(key, ttlMs);
      await updateSeatSnapshot(partyId, seatCount, seatIndex, "reserved", userId);
      return { ok: true, refreshed: true };
    }
    return { ok: false, reason: "reserved" };
  }

  await updateSeatSnapshot(partyId, seatCount, seatIndex, "reserved", userId);
  return { ok: true, refreshed: false };
}

export async function releaseSeat(
  partyId: string,
  seatIndex: number,
  userId: string,
  seatCount: number
) {
  const redis = getRedisClient();
  const key = getReservationKey(partyId, seatIndex);
  const current = await redis.get(key);
  if (current && current !== userId) {
    return { ok: false, reason: "not_owner" };
  }
  await redis.del(key);
  await updateSeatSnapshot(partyId, seatCount, seatIndex, "available", null);
  return { ok: true };
}

export async function lockSeat(
  partyId: string,
  seatIndex: number,
  seatCount: number,
  occupantId?: string | null
) {
  const redis = getRedisClient();
  await redis.del(getReservationKey(partyId, seatIndex));
  await updateSeatSnapshot(partyId, seatCount, seatIndex, "locked", occupantId ?? null);
  return { ok: true };
}

export async function unlockSeat(partyId: string, seatIndex: number, seatCount: number) {
  const redis = getRedisClient();
  const reservation = await redis.get(getReservationKey(partyId, seatIndex));
  const nextState: SeatState = reservation ? "reserved" : "available";
  await updateSeatSnapshot(partyId, seatCount, seatIndex, nextState, reservation ?? null);
  return { ok: true };
}

async function updateSeatSnapshot(
  partyId: string,
  seatCount: number,
  seatIndex: number,
  state: SeatState,
  userId?: string | null
) {
  const current = await getState(partyId, seatCount);
  current.seats[String(seatIndex)] = {
    state,
    userId: userId ?? null
  };
  await setState(partyId, current);
  await publish(partyId, {
    type: "seat_update",
    seatIndex,
    state,
    userId: userId ?? null
  });
}

async function syncReservationState(redis: Redis, state: PartyState) {
  const seatEntries = Object.entries(state.seats);
  if (seatEntries.length === 0) return;

  const pipeline = redis.pipeline();
  seatEntries.forEach(([seatIndex]) => {
    pipeline.exists(getReservationKey(state.partyId, Number(seatIndex)));
  });

  const results = await pipeline.exec();
  if (!results) return;

  let dirty = false;
  seatEntries.forEach(([seatIndex, seat], idx) => {
    const exists = results[idx]?.[1] as number | undefined;
    if (!exists && seat.state === "reserved") {
      state.seats[seatIndex] = { state: "available", userId: null };
      dirty = true;
    }
  });

  if (dirty) {
    await setState(state.partyId, state);
  }
}
