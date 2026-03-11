export type PlatformSessionModule =
  | "home"
  | "watch"
  | "party"
  | "studio"
  | "games"
  | "news"
  | "apps"
  | "admin";

export type PlatformSessionTrailEntry = {
  module: PlatformSessionModule | string;
  href: string;
  at: string;
  action?: string;
};

export type PlatformSessionState = {
  sessionKey: string;
  currentModule: PlatformSessionModule | string;
  sourceModule?: string | null;
  sourceHref?: string | null;
  activeTask?: string | null;
  partyCode?: string | null;
  squadId?: string | null;
  state?: Record<string, unknown>;
  trail: PlatformSessionTrailEntry[];
  updatedAt: string;
};

export type PlatformPresenceState = {
  sessionKey: string;
  module: PlatformSessionModule | string;
  status: string;
  deviceLabel?: string | null;
  lastSeenAt: string;
  metadata?: Record<string, unknown>;
};

const sessionMemory = new Map<string, PlatformSessionState>();
const presenceMemory = new Map<string, PlatformPresenceState>();

export function createPlatformSessionState(
  input: Omit<PlatformSessionState, "trail" | "updatedAt"> & {
    trail?: PlatformSessionTrailEntry[];
  }
): PlatformSessionState {
  return {
    ...input,
    trail: input.trail ?? [],
    updatedAt: new Date().toISOString()
  };
}

export function appendPlatformSessionTrail(
  state: PlatformSessionState,
  entry: Omit<PlatformSessionTrailEntry, "at">
) {
  const nextState: PlatformSessionState = {
    ...state,
    currentModule: entry.module,
    sourceModule: state.currentModule,
    sourceHref: entry.href,
    trail: [...state.trail, { ...entry, at: new Date().toISOString() }].slice(-12),
    updatedAt: new Date().toISOString()
  };
  return nextState;
}

export function setPlatformSessionMemory(state: PlatformSessionState) {
  sessionMemory.set(state.sessionKey, state);
}

export function getPlatformSessionMemory(sessionKey: string) {
  return sessionMemory.get(sessionKey) ?? null;
}

export function setPlatformPresenceMemory(state: PlatformPresenceState) {
  presenceMemory.set(`${state.sessionKey}:${state.module}`, state);
}

export function getPlatformPresenceMemory(sessionKey: string) {
  return [...presenceMemory.values()].filter((entry) => entry.sessionKey === sessionKey);
}
