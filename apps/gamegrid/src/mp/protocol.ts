export const MP_PROTOCOL_VERSION = 1;

export type MpRole = 'host' | 'client';

export interface BaseMessage {
  v: number;
  type: string;
  ts: number;
}

export interface InputMessage extends BaseMessage {
  type: 'input';
  playerId: string;
  input: unknown;
  seq: number;
}

export interface SnapshotMessage extends BaseMessage {
  type: 'snapshot';
  tick: number;
  state: unknown;
}

export interface EventMessage extends BaseMessage {
  type: 'event';
  event: unknown;
}

export interface ReadyMessage extends BaseMessage {
  type: 'ready';
  playerId: string;
  ready: boolean;
}

export interface StartMessage extends BaseMessage {
  type: 'start';
  gameId: string;
  seed: number;
}

export interface RematchMessage extends BaseMessage {
  type: 'rematch';
  seed: number;
}

export interface PingMessage extends BaseMessage {
  type: 'ping';
  pingId: string;
}

export interface PongMessage extends BaseMessage {
  type: 'pong';
  pingId: string;
}

export type MpProtocolMessage =
  | InputMessage
  | SnapshotMessage
  | EventMessage
  | ReadyMessage
  | StartMessage
  | RematchMessage
  | PingMessage
  | PongMessage;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasBaseShape(value: Record<string, unknown>): boolean {
  return typeof value.v === 'number' && typeof value.type === 'string' && typeof value.ts === 'number';
}

export function validateProtocolMessage(value: unknown): value is MpProtocolMessage {
  if (!isRecord(value) || !hasBaseShape(value)) return false;
  if (value.v !== MP_PROTOCOL_VERSION) return false;

  switch (value.type) {
    case 'input':
      return typeof value.playerId === 'string' && typeof value.seq === 'number' && 'input' in value;
    case 'snapshot':
      return typeof value.tick === 'number' && 'state' in value;
    case 'event':
      return 'event' in value;
    case 'ready':
      return typeof value.playerId === 'string' && typeof value.ready === 'boolean';
    case 'start':
      return typeof value.gameId === 'string' && typeof value.seed === 'number';
    case 'rematch':
      return typeof value.seed === 'number';
    case 'ping':
    case 'pong':
      return typeof value.pingId === 'string';
    default:
      return false;
  }
}

export function createProtocolMessage<T extends MpProtocolMessage['type']>(
  type: T,
  payload: Omit<Extract<MpProtocolMessage, { type: T }>, 'v' | 'type' | 'ts'>
): Extract<MpProtocolMessage, { type: T }> {
  return {
    ...(payload as object),
    v: MP_PROTOCOL_VERSION,
    type,
    ts: Date.now()
  } as Extract<MpProtocolMessage, { type: T }>;
}
