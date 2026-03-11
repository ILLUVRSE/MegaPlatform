import type { MpAdapter, MpAdapterInitContext } from '../mpAdapter';

interface StubState {
  started: boolean;
  lastInput: unknown;
  lastRemote: unknown;
  lastEvent: unknown;
  result: { status: 'stub'; note: string } | null;
}

export function createStubAdapter(gameId: string, isTurnBased: boolean): MpAdapter {
  const state: StubState = {
    started: false,
    lastInput: null,
    lastRemote: null,
    lastEvent: null,
    result: null
  };

  return {
    isTurnBased,
    capabilities: {
      coopPlanned: gameId === 'starlight-chronicles'
    },
    init(_context: MpAdapterInitContext) {
      state.started = false;
      state.result = null;
      state.lastEvent = null;
      state.lastInput = null;
      state.lastRemote = null;
    },
    onInput(localInput: unknown) {
      state.lastInput = localInput;
    },
    onRemoteMessage(msg: unknown) {
      state.lastRemote = msg;
    },
    getSnapshot() {
      return {
        gameId,
        mode: isTurnBased ? 'turn-based' : 'real-time',
        started: state.started,
        lastInput: state.lastInput,
        lastRemote: state.lastRemote
      };
    },
    applySnapshot(_snapshot: unknown) {
      // Placeholder adapter intentionally accepts snapshots without game logic.
    },
    serializeEvent(event: unknown) {
      return event;
    },
    applyEvent(event: unknown) {
      state.lastEvent = event;
    },
    start() {
      state.started = true;
    },
    stop() {
      state.started = false;
      state.result = { status: 'stub', note: `${gameId} multiplayer adapter is not fully implemented yet.` };
    },
    getResult() {
      return state.result;
    },
    serializeSnapshotSafe(snapshot: unknown) {
      try {
        return JSON.stringify(snapshot ?? null);
      } catch {
        return 'null';
      }
    },
    deserializeSnapshotSafe(raw: string) {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
  };
}
