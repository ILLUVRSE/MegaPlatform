import type { MpRole } from './protocol';

const SESSION_KEY = 'gamegrid.mp.session.v1';
const PARTY_KEY = 'gamegrid.party.session.v1';

export interface MultiplayerLaunchContext {
  enabled: true;
  gameId: string;
  roomCode: string;
  playerId: string;
  hostId: string;
  playerIds: string[];
  role: MpRole;
  seed: number;
  reconnectToken: string;
  signalingUrl: string;
  playerIndex: number;
  options?: Record<string, unknown>;
}

export function saveMultiplayerLaunchSession(context: MultiplayerLaunchContext) {
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(context));
}

export function loadMultiplayerLaunchSession(): MultiplayerLaunchContext | null {
  const raw = window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as MultiplayerLaunchContext;
    if (!parsed || parsed.enabled !== true || typeof parsed.gameId !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearMultiplayerLaunchSession() {
  window.sessionStorage.removeItem(SESSION_KEY);
}

export interface StoredPartySession {
  roomCode: string;
  playerId: string;
  hostId: string;
  role: MpRole;
  token: string;
  seed: number;
  signalingUrl: string;
}

export function savePartySession(session: StoredPartySession) {
  window.sessionStorage.setItem(PARTY_KEY, JSON.stringify(session));
}

export function loadPartySession(): StoredPartySession | null {
  const raw = window.sessionStorage.getItem(PARTY_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredPartySession;
    if (!parsed || typeof parsed.roomCode !== 'string' || typeof parsed.playerId !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPartySession() {
  window.sessionStorage.removeItem(PARTY_KEY);
}
