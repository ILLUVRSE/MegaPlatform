import { REQUIRED_GAME_IDS } from '../registry/games';

export interface RoomPlayer {
  id: string;
  name: string;
  ready: boolean;
  connected: boolean;
}

export interface RoomState {
  roomCode: string;
  hostId: string;
  seed: number;
  selectedGameId: string;
  gameOptions?: Record<string, unknown>;
  roomConfig?: {
    name: string;
    privacy: 'public' | 'private' | 'clan';
    theme: string;
    houseRules: string;
    playlist: string[];
    bettingPool: number;
    voiceEnabled: boolean;
  };
  players: RoomPlayer[];
  started: boolean;
  startedAt: number | null;
}

const DEFAULT_GAME = 'pixelpuck';

function randomCode(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

export function createSeed(): number {
  const high = Math.floor(Math.random() * 0x7fffffff);
  return high ^ Date.now();
}

export class RoomStateMachine {
  private state: RoomState;

  constructor(hostId: string, hostName: string, roomCode = randomCode(), seed = createSeed()) {
    this.state = {
      roomCode,
      hostId,
      seed,
      selectedGameId: DEFAULT_GAME,
      gameOptions: {},
      roomConfig: {
        name: 'Open Bar',
        privacy: 'private',
        theme: 'classic-green-felt',
        houseRules: 'Best of 3. No rage quits.',
        playlist: [DEFAULT_GAME],
        bettingPool: 0,
        voiceEnabled: false
      },
      players: [{ id: hostId, name: hostName, ready: false, connected: true }],
      started: false,
      startedAt: null
    };
  }

  snapshot(): RoomState {
    return {
      ...this.state,
      players: this.state.players.map((player) => ({ ...player }))
    };
  }

  joinPlayer(playerId: string, name: string) {
    if (this.state.players.some((player) => player.id === playerId)) {
      return;
    }
    this.state.players.push({ id: playerId, name, ready: false, connected: true });
  }

  setConnected(playerId: string, connected: boolean) {
    const player = this.state.players.find((entry) => entry.id === playerId);
    if (!player) return;
    player.connected = connected;
    if (!connected) {
      player.ready = false;
    }
  }

  removePlayer(playerId: string) {
    this.state.players = this.state.players.filter((player) => player.id !== playerId);
    if (this.state.hostId === playerId && this.state.players.length > 0) {
      this.state.hostId = this.state.players[0].id;
    }
  }

  setReady(playerId: string, ready: boolean) {
    const player = this.state.players.find((entry) => entry.id === playerId);
    if (!player) {
      throw new Error(`unknown player: ${playerId}`);
    }
    player.ready = ready;
  }

  selectGame(gameId: string, actorId: string) {
    if (actorId !== this.state.hostId) {
      throw new Error('only host can select game');
    }
    if (!REQUIRED_GAME_IDS.includes(gameId as (typeof REQUIRED_GAME_IDS)[number])) {
      throw new Error(`unknown game: ${gameId}`);
    }
    this.state.selectedGameId = gameId;
    this.state.gameOptions = {};
  }

  canStart(): boolean {
    const connected = this.state.players.filter((player) => player.connected);
    if (connected.length < 2) return false;
    return connected.every((player) => player.ready);
  }

  start(actorId: string): RoomState {
    if (actorId !== this.state.hostId) {
      throw new Error('only host can start');
    }
    if (!this.canStart()) {
      throw new Error('room is not ready to start');
    }

    this.state.started = true;
    this.state.startedAt = Date.now();
    return this.snapshot();
  }

  returnToLobby(actorId: string): RoomState {
    if (actorId !== this.state.hostId) {
      throw new Error('only host can return room to lobby');
    }
    this.state.started = false;
    this.state.startedAt = null;
    for (const player of this.state.players) {
      player.ready = false;
    }
    this.state.seed = createSeed();
    return this.snapshot();
  }
}
