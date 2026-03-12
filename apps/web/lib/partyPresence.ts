import type { PartyState } from "@illuvrse/world-state";

export const PARTY_HEARTBEAT_TIMEOUT_MS = Number(
  process.env.PARTY_HEARTBEAT_TIMEOUT_MS ?? 30_000
);
export const PARTY_KEEPALIVE_INTERVAL_MS = Number(
  process.env.PARTY_KEEPALIVE_INTERVAL_MS ?? 15_000
);
export const PARTY_RECONNECT_BASE_MS = Number(
  process.env.NEXT_PUBLIC_PARTY_RECONNECT_BASE_MS ?? 1_000
);
export const PARTY_RECONNECT_MAX_MS = Number(
  process.env.NEXT_PUBLIC_PARTY_RECONNECT_MAX_MS ?? 15_000
);
export const PARTY_RECONNECT_ATTEMPTS = Number(
  process.env.NEXT_PUBLIC_PARTY_RECONNECT_ATTEMPTS ?? 8
);

export type PartyPresenceHealth = {
  participantCount: number;
  activeParticipantCount: number;
  staleParticipantCount: number;
  lastHeartbeatAt: string | null;
  lastHostHeartbeatAt: string | null;
  pingCount: number;
  heartbeatFresh: boolean;
  hostHeartbeatFresh: boolean;
  slosMet: boolean;
};

export function isHeartbeatFresh(lastSeenAt: string | null | undefined, nowMs = Date.now()) {
  if (!lastSeenAt) return false;
  return nowMs - new Date(lastSeenAt).getTime() <= PARTY_HEARTBEAT_TIMEOUT_MS;
}

export function getPartyReconnectDelayMs(attempt: number) {
  return Math.min(PARTY_RECONNECT_MAX_MS, PARTY_RECONNECT_BASE_MS * 2 ** attempt);
}

export function evaluatePartyPresenceHealth(
  state: PartyState,
  input?: { hostId?: string | null; nowMs?: number }
): PartyPresenceHealth {
  const nowMs = input?.nowMs ?? Date.now();
  const participantSnapshots = Object.values(state.participants);
  const activeParticipantCount = participantSnapshots.filter((participant) =>
    isHeartbeatFresh(participant.lastSeenAt ?? null, nowMs)
  ).length;
  const staleParticipantCount = Math.max(0, participantSnapshots.length - activeParticipantCount);
  const heartbeatFresh = isHeartbeatFresh(state.heartbeat?.lastSeenAt ?? null, nowMs);
  const hostHeartbeatFresh = isHeartbeatFresh(state.heartbeat?.lastHostHeartbeatAt ?? null, nowMs);

  return {
    participantCount: participantSnapshots.length,
    activeParticipantCount,
    staleParticipantCount,
    lastHeartbeatAt: state.heartbeat?.lastSeenAt ?? null,
    lastHostHeartbeatAt: state.heartbeat?.lastHostHeartbeatAt ?? null,
    pingCount: state.heartbeat?.pingCount ?? 0,
    heartbeatFresh,
    hostHeartbeatFresh,
    slosMet: heartbeatFresh && (!input?.hostId || hostHeartbeatFresh) && staleParticipantCount === 0
  };
}
