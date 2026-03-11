import type { MpRole } from './protocol';

export interface MpAdapterInitContext {
  role: MpRole;
  playerId: string;
  seed: number;
  options?: Record<string, unknown>;
}

export interface MpAdapter<TInput = unknown, TSnapshot = unknown, TEvent = unknown, TResult = unknown> {
  readonly isTurnBased: boolean;
  readonly capabilities?: {
    coopPlanned?: boolean;
  };
  init(context: MpAdapterInitContext): void;
  onInput(localInput: TInput): void;
  onRemoteMessage(msg: unknown): void;
  getSnapshot(): TSnapshot;
  applySnapshot(snapshot: TSnapshot): void;
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
