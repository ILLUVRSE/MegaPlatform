import type { MpRole } from './protocol';

export interface MpAdapterInitContext {
  role: MpRole;
  playerId: string;
  seed: number;
  options?: Record<string, unknown>;
}

export type MpSpectatorBandwidthMode = 'full' | 'minimal';

export interface MpSpectatorSnapshotOptions {
  bandwidthMode?: MpSpectatorBandwidthMode;
  includeGhostPlayback?: boolean;
}

export interface MpSpectatorSnapshotPayload<TSnapshot = unknown, TGhostPlayback = unknown> {
  snapshot: TSnapshot;
  bandwidthMode: MpSpectatorBandwidthMode;
  ghostPlayback?: TGhostPlayback | null;
}

export interface MpAdapter<TInput = unknown, TSnapshot = unknown, TEvent = unknown, TResult = unknown> {
  readonly isTurnBased: boolean;
  readonly capabilities?: {
    coopPlanned?: boolean;
    spectator?: {
      readOnlySnapshots: true;
      ghostPlayback?: 'optional';
      bandwidthModes?: MpSpectatorBandwidthMode[];
    };
  };
  init(context: MpAdapterInitContext): void;
  onInput(localInput: TInput): void;
  onRemoteMessage(msg: unknown): void;
  getSnapshot(): TSnapshot;
  applySnapshot(snapshot: TSnapshot): void;
  getSpectatorSnapshot?(options?: MpSpectatorSnapshotOptions): MpSpectatorSnapshotPayload;
  applySpectatorSnapshot?(payload: MpSpectatorSnapshotPayload): void;
  serializeEvent(event: TEvent): unknown;
  applyEvent(event: TEvent): void;
  start(): void;
  stop(): void;
  getResult(): TResult | null;
  serializeSnapshotSafe?(snapshot: TSnapshot): string;
  deserializeSnapshotSafe?(raw: string): TSnapshot | null;
}

export interface GameMpAdapterDescriptor {
  gameId: string;
  adapter: MpAdapter;
  mode: 'real-time' | 'turn-based';
  messageSchema: string[];
  implemented: boolean;
}
