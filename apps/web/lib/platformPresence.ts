import path from "path";
import { promises as fs } from "fs";
import { prisma } from "@illuvrse/db";
import { getState, type PartyState } from "@illuvrse/world-state";
import { resolvePlatformSessionKey, type SessionGraphIdentity } from "@/lib/platformSessionGraph";
import {
  evaluatePartyPresenceHealth,
  PARTY_HEARTBEAT_TIMEOUT_MS,
  PARTY_KEEPALIVE_INTERVAL_MS
} from "@/lib/partyPresence";

const db = prisma as any;

const PARTY_PRESENCE_MODULE_PREFIX = "party-room:";
const PARTY_PRESENCE_LOOKBACK_MS = 15 * 60 * 1000;
const PARTY_PRESENCE_RECENT_BREACH_LIMIT = 10;

type PartyPresenceSloPolicy = {
  presenceUpFraction: {
    target: number;
    operator: ">=" | "<=";
    severity: string;
  };
  medianReconnectMs: {
    target: number;
    operator: ">=" | "<=";
    severity: string;
  };
  hostAvailability: {
    target: number;
    operator: ">=" | "<=";
    severity: string;
  };
};

type PartyPresenceSloThreshold = PartyPresenceSloPolicy["presenceUpFraction"];

type PartyPresenceSloMetricKey =
  | "presence_up_fraction"
  | "median_reconnect_ms"
  | "host_availability";

type PartyPresenceSloBreach = {
  metricKey: PartyPresenceSloMetricKey;
  observed: number;
  target: number;
  operator: ">=" | "<=";
  severity: string;
  roomId?: string;
  roomCode?: string;
};

type PartyPresenceTelemetryMetadata = {
  roomId?: string | null;
  roomCode?: string | null;
  heartbeatGapMs?: number | null;
  reconnectMs?: number | null;
  isHost?: boolean | null;
  hostAvailability?: number | null;
  presenceUpFraction?: number | null;
};

type PartyPresenceRoomBreakdown = {
  partyId: string;
  code: string;
  participantCount: number;
  activeParticipantCount: number;
  staleParticipantCount: number;
  pingCount: number;
  heartbeatFresh: boolean;
  hostHeartbeatFresh: boolean;
  lastHeartbeatAt: string | null;
  lastHostHeartbeatAt: string | null;
  presenceUpFraction: number;
  medianReconnectMs: number;
  hostAvailability: number;
  slosMet: boolean;
  breaches: PartyPresenceSloBreach[];
};

type PartyPresenceSummary = {
  generatedAt: string;
  lookbackMinutes: number;
  slosMet: boolean;
  metrics: Record<PartyPresenceSloMetricKey, number>;
  thresholds: PartyPresenceSloPolicy;
  breachCount: number;
  recentBreaches: PartyPresenceSloBreach[];
  summary: {
    totalRooms: number;
    healthyRooms: number;
    degradedRooms: number;
  };
  rooms: PartyPresenceRoomBreakdown[];
};

type PartyPresenceAlertEvent = {
  generatedAt: string;
  summary: PartyPresenceSummary;
};

type PartyPresenceAlertDispatcher = (event: PartyPresenceAlertEvent) => Promise<void>;

const defaultPartyPresenceSloPolicy: PartyPresenceSloPolicy = {
  presenceUpFraction: {
    target: 0.99,
    operator: ">=",
    severity: "critical"
  },
  medianReconnectMs: {
    target: 5_000,
    operator: "<=",
    severity: "warning"
  },
  hostAvailability: {
    target: 0.995,
    operator: ">=",
    severity: "critical"
  }
};

let partyPresenceAlertDispatcherOverride: PartyPresenceAlertDispatcher | null = null;

export async function heartbeatPlatformPresence(
  identity: SessionGraphIdentity,
  input: {
    module: string;
    status: string;
    deviceLabel?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  const sessionKey = resolvePlatformSessionKey(identity);

  return db.platformPresence.upsert({
    where: {
      sessionKey_module: {
        sessionKey,
        module: input.module
      }
    },
    update: {
      userId: identity.userId ?? null,
      anonId: identity.anonId ?? null,
      profileId: identity.profileId ?? null,
      creatorProfileId: identity.creatorProfileId ?? null,
      status: input.status,
      deviceLabel: input.deviceLabel ?? null,
      metadataJson: input.metadata ?? {},
      lastSeenAt: new Date()
    },
    create: {
      sessionKey,
      userId: identity.userId ?? null,
      anonId: identity.anonId ?? null,
      profileId: identity.profileId ?? null,
      creatorProfileId: identity.creatorProfileId ?? null,
      module: input.module,
      status: input.status,
      deviceLabel: input.deviceLabel ?? null,
      metadataJson: input.metadata ?? {},
      lastSeenAt: new Date()
    }
  });
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseTelemetryMetadata(value: unknown): PartyPresenceTelemetryMetadata {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>;
  return {
    roomId: typeof input.roomId === "string" ? input.roomId : null,
    roomCode: typeof input.roomCode === "string" ? input.roomCode : null,
    heartbeatGapMs: isFiniteNumber(input.heartbeatGapMs) ? input.heartbeatGapMs : null,
    reconnectMs: isFiniteNumber(input.reconnectMs) ? input.reconnectMs : null,
    isHost: typeof input.isHost === "boolean" ? input.isHost : null,
    hostAvailability: isFiniteNumber(input.hostAvailability) ? input.hostAvailability : null,
    presenceUpFraction: isFiniteNumber(input.presenceUpFraction) ? input.presenceUpFraction : null
  };
}

function calculateMedian(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[midpoint - 1] + sorted[midpoint]) / 2
    : sorted[midpoint];
}

function compareSlo(observed: number, operator: ">=" | "<=", target: number) {
  return operator === ">=" ? observed >= target : observed <= target;
}

function toBreach(
  metricKey: PartyPresenceSloMetricKey,
  observed: number,
  threshold: PartyPresenceSloThreshold,
  room?: { partyId: string; code: string }
): PartyPresenceSloBreach | null {
  return compareSlo(observed, threshold.operator, threshold.target)
    ? null
    : {
        metricKey,
        observed,
        target: threshold.target,
        operator: threshold.operator,
        severity: threshold.severity,
        roomId: room?.partyId,
        roomCode: room?.code
      };
}

async function loadPartyPresenceSloPolicy(): Promise<PartyPresenceSloPolicy> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "slos.json"), "utf-8");
    const entries = JSON.parse(raw) as Array<Record<string, unknown>>;
    const byMetric = new Map(
      entries
        .filter((entry) => typeof entry.metricKey === "string")
        .map((entry) => [entry.metricKey as string, entry])
    );

    const readThreshold = (
      metricKey: PartyPresenceSloMetricKey,
      fallback: PartyPresenceSloThreshold
    ) => {
      const entry = byMetric.get(metricKey);
      return {
        target: isFiniteNumber(entry?.target) ? entry.target : fallback.target,
        operator: entry?.operator === "<=" || entry?.operator === ">=" ? entry.operator : fallback.operator,
        severity: typeof entry?.severity === "string" ? entry.severity : fallback.severity
      };
    };

    return {
      presenceUpFraction: readThreshold("presence_up_fraction", defaultPartyPresenceSloPolicy.presenceUpFraction),
      medianReconnectMs: readThreshold("median_reconnect_ms", defaultPartyPresenceSloPolicy.medianReconnectMs),
      hostAvailability: readThreshold("host_availability", defaultPartyPresenceSloPolicy.hostAvailability)
    };
  } catch {
    return defaultPartyPresenceSloPolicy;
  }
}

function extractReconnectSamples(rows: Array<{ metadataJson?: unknown; lastSeenAt: Date }>) {
  return rows
    .map((row) => {
      const metadata = parseTelemetryMetadata(row.metadataJson);
      if (metadata.reconnectMs !== null && metadata.reconnectMs !== undefined) {
        return metadata.reconnectMs;
      }
      return metadata.heartbeatGapMs ?? 0;
    })
    .filter((value) => Number.isFinite(value) && value >= 0);
}

function evaluateRoomAgainstPolicy(
  room: Omit<PartyPresenceRoomBreakdown, "slosMet" | "breaches">,
  policy: PartyPresenceSloPolicy
): PartyPresenceRoomBreakdown {
  const scope = { partyId: room.partyId, code: room.code };
  const breaches = [
    toBreach("presence_up_fraction", room.presenceUpFraction, policy.presenceUpFraction, scope),
    toBreach("median_reconnect_ms", room.medianReconnectMs, policy.medianReconnectMs, scope),
    toBreach("host_availability", room.hostAvailability, policy.hostAvailability, scope)
  ].filter(Boolean) as PartyPresenceSloBreach[];

  return {
    ...room,
    slosMet: breaches.length === 0,
    breaches
  };
}

async function defaultPartyPresenceAlertDispatcher(event: PartyPresenceAlertEvent) {
  const payload = {
    source: "party_presence_slo",
    generatedAt: event.generatedAt,
    breachCount: event.summary.breachCount,
    degradedRooms: event.summary.summary.degradedRooms,
    recentBreaches: event.summary.recentBreaches
  };
  console.error("[party_presence_slo_breach]", JSON.stringify(payload));

  const webhookUrl = process.env.PARTY_PRESENCE_SLO_WEBHOOK_URL;
  if (!webhookUrl) return;

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch((error) => {
    console.error("[party_presence_slo_webhook_failed]", error);
  });
}

async function dispatchPartyPresenceAlert(event: PartyPresenceAlertEvent) {
  const dispatcher = partyPresenceAlertDispatcherOverride ?? defaultPartyPresenceAlertDispatcher;
  await dispatcher(event);
}

export function setPartyPresenceAlertDispatcherForTests(dispatcher: PartyPresenceAlertDispatcher | null) {
  partyPresenceAlertDispatcherOverride = dispatcher;
}

export async function recordPartyRoomPresence(
  identity: SessionGraphIdentity,
  input: {
    partyId: string;
    roomCode: string;
    status: string;
    isHost: boolean;
    heartbeatGapMs?: number | null;
    reconnectMs?: number | null;
    hostAvailability?: number | null;
    presenceUpFraction?: number | null;
    deviceLabel?: string | null;
  }
) {
  return heartbeatPlatformPresence(identity, {
    module: `${PARTY_PRESENCE_MODULE_PREFIX}${input.partyId}`,
    status: input.status,
    deviceLabel: input.deviceLabel ?? null,
    metadata: {
      roomId: input.partyId,
      roomCode: input.roomCode,
      isHost: input.isHost,
      heartbeatGapMs: input.heartbeatGapMs ?? null,
      reconnectMs: input.reconnectMs ?? null,
      hostAvailability: input.hostAvailability ?? null,
      presenceUpFraction: input.presenceUpFraction ?? null
    }
  });
}

export async function buildPartyPresenceSummary(input?: {
  nowMs?: number;
  alertOnBreach?: boolean;
}): Promise<PartyPresenceSummary> {
  const nowMs = input?.nowMs ?? Date.now();
  const lookbackStart = new Date(nowMs - PARTY_PRESENCE_LOOKBACK_MS);
  const policy = await loadPartyPresenceSloPolicy();

  const [parties, recentPresenceRows] = await Promise.all([
    db.party.findMany({
      select: {
        id: true,
        code: true,
        hostId: true,
        seats: { select: { id: true } }
      },
      take: 50
    }),
    db.platformPresence.findMany({
      where: {
        module: {
          startsWith: PARTY_PRESENCE_MODULE_PREFIX
        },
        lastSeenAt: {
          gte: lookbackStart
        }
      },
      orderBy: { lastSeenAt: "desc" },
      take: 500
    })
  ]);

  const rowsByRoom = new Map<string, Array<{ metadataJson?: unknown; lastSeenAt: Date }>>();
  for (const row of recentPresenceRows) {
    const metadata = parseTelemetryMetadata(row.metadataJson);
    const roomId = metadata.roomId ?? row.module.replace(PARTY_PRESENCE_MODULE_PREFIX, "");
    if (!rowsByRoom.has(roomId)) {
      rowsByRoom.set(roomId, []);
    }
    rowsByRoom.get(roomId)?.push({ metadataJson: row.metadataJson, lastSeenAt: row.lastSeenAt });
  }

  const rooms = await Promise.all(
    parties.map(async (party) => {
      const state = (await getState(party.id, party.seats.length)) as PartyState;
      const health = evaluatePartyPresenceHealth(state, { hostId: party.hostId, nowMs });
      const reconnectSamples = extractReconnectSamples(rowsByRoom.get(party.id) ?? []);
      const presenceUpFraction =
        health.participantCount > 0 ? health.activeParticipantCount / health.participantCount : 1;
      const room = evaluateRoomAgainstPolicy(
        {
          partyId: party.id,
          code: party.code,
          participantCount: health.participantCount,
          activeParticipantCount: health.activeParticipantCount,
          staleParticipantCount: health.staleParticipantCount,
          pingCount: health.pingCount,
          heartbeatFresh: health.heartbeatFresh,
          hostHeartbeatFresh: health.hostHeartbeatFresh,
          lastHeartbeatAt: health.lastHeartbeatAt,
          lastHostHeartbeatAt: health.lastHostHeartbeatAt,
          presenceUpFraction,
          medianReconnectMs: calculateMedian(reconnectSamples),
          hostAvailability: health.hostHeartbeatFresh ? 1 : 0
        },
        policy
      );

      return room;
    })
  );

  const metrics = {
    presence_up_fraction:
      rooms.length > 0 ? rooms.reduce((sum, room) => sum + room.presenceUpFraction, 0) / rooms.length : 1,
    median_reconnect_ms: calculateMedian(rooms.map((room) => room.medianReconnectMs)),
    host_availability:
      rooms.length > 0 ? rooms.reduce((sum, room) => sum + room.hostAvailability, 0) / rooms.length : 1
  } satisfies Record<PartyPresenceSloMetricKey, number>;

  const recentBreaches = rooms
    .flatMap((room) => room.breaches)
    .sort((a, b) => {
      const severityDelta = (a.severity === "critical" ? 0 : 1) - (b.severity === "critical" ? 0 : 1);
      if (severityDelta !== 0) return severityDelta;
      return a.metricKey.localeCompare(b.metricKey);
    })
    .slice(0, PARTY_PRESENCE_RECENT_BREACH_LIMIT);

  const overallBreaches = [
    toBreach("presence_up_fraction", metrics.presence_up_fraction, policy.presenceUpFraction),
    toBreach("median_reconnect_ms", metrics.median_reconnect_ms, policy.medianReconnectMs),
    toBreach("host_availability", metrics.host_availability, policy.hostAvailability),
    ...recentBreaches
  ].filter(Boolean) as PartyPresenceSloBreach[];

  const summary: PartyPresenceSummary = {
    generatedAt: new Date(nowMs).toISOString(),
    lookbackMinutes: PARTY_PRESENCE_LOOKBACK_MS / 60_000,
    slosMet: overallBreaches.length === 0,
    metrics,
    thresholds: policy,
    breachCount: overallBreaches.length,
    recentBreaches,
    summary: {
      totalRooms: rooms.length,
      healthyRooms: rooms.filter((room) => room.slosMet).length,
      degradedRooms: rooms.filter((room) => !room.slosMet).length
    },
    rooms
  };

  if (input?.alertOnBreach && !summary.slosMet) {
    await dispatchPartyPresenceAlert({
      generatedAt: summary.generatedAt,
      summary
    });
  }

  return summary;
}

export function estimatePresenceHeartbeatGapMs(lastSeenAt: string | null | undefined, nowMs = Date.now()) {
  if (!lastSeenAt) return 0;
  return Math.max(0, nowMs - new Date(lastSeenAt).getTime() - PARTY_KEEPALIVE_INTERVAL_MS);
}

export function estimatePresenceReconnectMs(lastSeenAt: string | null | undefined, nowMs = Date.now()) {
  if (!lastSeenAt) return 0;
  const elapsedMs = nowMs - new Date(lastSeenAt).getTime();
  if (elapsedMs <= PARTY_HEARTBEAT_TIMEOUT_MS) return 0;
  return elapsedMs - PARTY_HEARTBEAT_TIMEOUT_MS;
}
