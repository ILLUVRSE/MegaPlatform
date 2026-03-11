import type { MpRole } from './protocol';
import type { RoomState } from './room';

interface BaseServerEvent {
  type: string;
}

interface RoomStateEvent extends BaseServerEvent {
  type: 'room_state';
  room: RoomState;
}

interface RoomJoinedEvent extends BaseServerEvent {
  type: 'room_joined';
  roomCode: string;
  playerId: string;
  hostId: string;
  role: MpRole;
  token: string;
  seed: number;
}

interface GameStartedEvent extends BaseServerEvent {
  type: 'game_started';
  gameId: string;
  seed: number;
  startedAt: number;
  gameOptions?: Record<string, unknown>;
}

interface ErrorEvent extends BaseServerEvent {
  type: 'error';
  message: string;
}

export type PartyServerEvent = RoomStateEvent | RoomJoinedEvent | GameStartedEvent | ErrorEvent;

export interface PartySession {
  roomCode: string;
  playerId: string;
  hostId: string;
  token: string;
  role: MpRole;
  seed: number;
}

export interface PartyClientOptions {
  signalingUrl: string;
  onEvent: (event: PartyServerEvent) => void;
  onConnectionChange?: (connected: boolean) => void;
}

function parseEvent(raw: string): PartyServerEvent | null {
  try {
    const event = JSON.parse(raw) as PartyServerEvent;
    if (!event || typeof event.type !== 'string') return null;
    return event;
  } catch {
    return null;
  }
}

function sendSocket(socket: WebSocket, payload: object) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

export class PartyClient {
  private readonly options: PartyClientOptions;
  private socket: WebSocket | null = null;
  private reconnectTimer = 0;
  private shouldReconnect = true;
  private session: PartySession | null = null;

  constructor(options: PartyClientOptions) {
    this.options = options;
  }

  connect() {
    this.openSocket();
  }

  disconnect() {
    this.shouldReconnect = false;
    window.clearTimeout(this.reconnectTimer);
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
    this.socket = null;
    this.options.onConnectionChange?.(false);
  }

  createRoom(name: string) {
    if (!this.socket) return;
    sendSocket(this.socket, { type: 'create_room', displayName: name });
  }

  joinRoom(roomCode: string, name: string) {
    if (!this.socket) return;
    sendSocket(this.socket, { type: 'join_room', roomCode: roomCode.toUpperCase(), displayName: name });
  }

  setReady(ready: boolean) {
    if (!this.socket || !this.session) return;
    sendSocket(this.socket, { type: 'set_ready', roomCode: this.session.roomCode, ready });
  }

  selectGame(gameId: string) {
    if (!this.socket || !this.session) return;
    sendSocket(this.socket, { type: 'select_game', roomCode: this.session.roomCode, gameId });
  }

  setGameOptions(gameOptions: Record<string, unknown>) {
    if (!this.socket || !this.session) return;
    sendSocket(this.socket, { type: 'set_game_options', roomCode: this.session.roomCode, gameOptions });
  }

  setRoomConfig(roomConfig: Record<string, unknown>) {
    if (!this.socket || !this.session) return;
    sendSocket(this.socket, { type: 'set_room_config', roomCode: this.session.roomCode, roomConfig });
  }

  startGame() {
    if (!this.socket || !this.session) return;
    sendSocket(this.socket, { type: 'start_game', roomCode: this.session.roomCode });
  }

  returnToLobby() {
    if (!this.socket || !this.session) return;
    sendSocket(this.socket, { type: 'return_lobby', roomCode: this.session.roomCode });
  }

  getSession(): PartySession | null {
    return this.session;
  }

  hydrateSession(session: PartySession) {
    this.session = session;
  }

  private openSocket() {
    const socket = new WebSocket(this.options.signalingUrl);
    this.socket = socket;

    socket.addEventListener('open', () => {
      this.options.onConnectionChange?.(true);
      if (this.session) {
        sendSocket(socket, {
          type: 'resume_room',
          roomCode: this.session.roomCode,
          playerId: this.session.playerId,
          token: this.session.token
        });
      }
    });

    socket.addEventListener('message', (event) => {
      const parsed = parseEvent(String(event.data));
      if (!parsed) return;
      if (parsed.type === 'room_joined') {
        this.session = {
          roomCode: parsed.roomCode,
          playerId: parsed.playerId,
          hostId: parsed.hostId,
          token: parsed.token,
          role: parsed.role,
          seed: parsed.seed
        };
      }
      this.options.onEvent(parsed);
    });

    socket.addEventListener('close', () => {
      this.options.onConnectionChange?.(false);
      this.socket = null;
      if (!this.shouldReconnect) return;
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = window.setTimeout(() => this.openSocket(), 1200);
    });
  }
}
