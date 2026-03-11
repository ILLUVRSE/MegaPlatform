export const PROTOCOL_VERSION = 1;

export const INPUT_BITS = {
  sprint: 1 << 0,
  pass: 1 << 1,
  shoot: 1 << 2,
  tackle: 1 << 3,
  switch: 1 << 4,
  shootRelease: 1 << 5
} as const;

export interface PackedInput {
  moveX: number;
  moveY: number;
  bits: number;
  shootCharge: number;
}

export interface InputButtons {
  sprint: boolean;
  pass: boolean;
  shoot: boolean;
  tackle: boolean;
  switchPlayer: boolean;
  shootRelease: boolean;
}

export interface QuantizedInput {
  clientTick: number;
  seq: number;
  inputBits: number;
  moveX: number;
  moveY: number;
  shootCharge: number;
}

export interface NetPlayerState {
  id: string;
  team: 'home' | 'away';
  x: number;
  y: number;
  vx: number;
  vy: number;
  stamina: number;
}

export interface NetBallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string | null;
}

export interface MatchSnapshotState {
  players: NetPlayerState[];
  ball: NetBallState;
  homeScore: number;
  awayScore: number;
  timeRemainingSec: number;
  inOvertime: boolean;
  checksum: number;
}

export type ClientToServerMessage =
  | { type: 'HELLO'; clientVersion: string; resumeClientId?: string }
  | { type: 'CREATE_LOBBY' }
  | { type: 'JOIN_LOBBY'; code: string }
  | { type: 'QUEUE_MATCH' }
  | { type: 'LEAVE_QUEUE' }
  | { type: 'READY'; matchId: string }
  | { type: 'INPUT'; matchId: string; clientTick: number; seq: number; inputBits: number; moveX: number; moveY: number; shootCharge: number }
  | { type: 'HOST_SNAPSHOT'; matchId: string; serverTick: number; state: MatchSnapshotState }
  | { type: 'RECONNECT'; matchId: string }
  | { type: 'PING'; t: number };

export type ServerToClientMessage =
  | { type: 'WELCOME'; clientId: string; protocolVersion: number }
  | { type: 'LOBBY_CREATED'; code: string; lobbyId: string }
  | { type: 'LOBBY_JOINED'; code: string; players: string[] }
  | { type: 'MATCH_FOUND'; matchId: string; hostClientId: string; seed: number; startAtTick: number }
  | { type: 'START_MATCH'; matchId: string }
  | { type: 'SNAPSHOT'; matchId: string; serverTick: number; state: MatchSnapshotState }
  | { type: 'REMOTE_INPUT'; matchId: string; fromClientId: string; payload: QuantizedInput }
  | { type: 'PONG'; t: number }
  | { type: 'PLAYER_DISCONNECTED'; clientId: string }
  | { type: 'FORFEIT_WIN'; matchId: string; winnerClientId: string }
  | { type: 'ERROR'; code: string; message: string };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isString = (v: unknown): v is string => typeof v === 'string';

export const isClientToServerMessage = (v: unknown): v is ClientToServerMessage => {
  if (!isRecord(v) || !isString(v.type)) {
    return false;
  }
  switch (v.type) {
    case 'HELLO':
      return isString(v.clientVersion) && (v.resumeClientId === undefined || isString(v.resumeClientId));
    case 'CREATE_LOBBY':
    case 'QUEUE_MATCH':
    case 'LEAVE_QUEUE':
      return true;
    case 'JOIN_LOBBY':
      return isString(v.code);
    case 'READY':
    case 'RECONNECT':
      return isString(v.matchId);
    case 'INPUT':
      return (
        isString(v.matchId) &&
        isNumber(v.clientTick) &&
        isNumber(v.seq) &&
        isNumber(v.inputBits) &&
        isNumber(v.moveX) &&
        isNumber(v.moveY) &&
        isNumber(v.shootCharge)
      );
    case 'HOST_SNAPSHOT':
      return isString(v.matchId) && isNumber(v.serverTick) && isRecord(v.state);
    case 'PING':
      return isNumber(v.t);
    default:
      return false;
  }
};

export const isServerToClientMessage = (v: unknown): v is ServerToClientMessage => {
  if (!isRecord(v) || !isString(v.type)) {
    return false;
  }
  switch (v.type) {
    case 'WELCOME':
      return isString(v.clientId) && isNumber(v.protocolVersion);
    case 'LOBBY_CREATED':
      return isString(v.code) && isString(v.lobbyId);
    case 'LOBBY_JOINED':
      return isString(v.code) && Array.isArray(v.players);
    case 'MATCH_FOUND':
      return isString(v.matchId) && isString(v.hostClientId) && isNumber(v.seed) && isNumber(v.startAtTick);
    case 'START_MATCH':
      return isString(v.matchId);
    case 'SNAPSHOT':
      return isString(v.matchId) && isNumber(v.serverTick) && isRecord(v.state);
    case 'REMOTE_INPUT':
      return isString(v.matchId) && isString(v.fromClientId) && isRecord(v.payload);
    case 'PONG':
      return isNumber(v.t);
    case 'PLAYER_DISCONNECTED':
      return isString(v.clientId);
    case 'FORFEIT_WIN':
      return isString(v.matchId) && isString(v.winnerClientId);
    case 'ERROR':
      return isString(v.code) && isString(v.message);
    default:
      return false;
  }
};

export const encodeInputBits = (buttons: InputButtons): number => {
  let bits = 0;
  if (buttons.sprint) bits |= INPUT_BITS.sprint;
  if (buttons.pass) bits |= INPUT_BITS.pass;
  if (buttons.shoot) bits |= INPUT_BITS.shoot;
  if (buttons.tackle) bits |= INPUT_BITS.tackle;
  if (buttons.switchPlayer) bits |= INPUT_BITS.switch;
  if (buttons.shootRelease) bits |= INPUT_BITS.shootRelease;
  return bits;
};

export const decodeInputBits = (bits: number): InputButtons => ({
  sprint: (bits & INPUT_BITS.sprint) !== 0,
  pass: (bits & INPUT_BITS.pass) !== 0,
  shoot: (bits & INPUT_BITS.shoot) !== 0,
  tackle: (bits & INPUT_BITS.tackle) !== 0,
  switchPlayer: (bits & INPUT_BITS.switch) !== 0,
  shootRelease: (bits & INPUT_BITS.shootRelease) !== 0
});

const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

export const quantizeAxis = (v: number): number => clamp(Math.round(v * 127), -127, 127);
export const dequantizeAxis = (v: number): number => clamp(v / 127, -1, 1);

export const quantizeInput = (input: PackedInput, clientTick: number, seq: number): QuantizedInput => ({
  clientTick,
  seq,
  inputBits: input.bits,
  moveX: quantizeAxis(input.moveX),
  moveY: quantizeAxis(input.moveY),
  shootCharge: clamp(Math.round(input.shootCharge), 0, 255)
});

export const checksumState = (state: MatchSnapshotState): number => {
  let acc = 17;
  for (const p of state.players) {
    acc = (acc * 31 + Math.round(p.x * 10)) | 0;
    acc = (acc * 31 + Math.round(p.y * 10)) | 0;
    acc = (acc * 31 + Math.round(p.vx * 10)) | 0;
    acc = (acc * 31 + Math.round(p.vy * 10)) | 0;
  }
  acc = (acc * 31 + Math.round(state.ball.x * 10)) | 0;
  acc = (acc * 31 + Math.round(state.ball.y * 10)) | 0;
  acc = (acc * 31 + state.homeScore) | 0;
  acc = (acc * 31 + state.awayScore) | 0;
  return acc >>> 0;
};
