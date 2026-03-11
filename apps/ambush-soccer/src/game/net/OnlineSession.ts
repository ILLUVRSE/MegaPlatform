import type { ServerToClientMessage } from '../../shared/net/protocol';
import { NetClient } from './NetClient';

export interface MatchFoundInfo {
  matchId: string;
  hostClientId: string;
  seed: number;
  startAtTick: number;
}

export class OnlineSession {
  readonly net: NetClient;
  lobbyCode: string | null = null;
  players: string[] = [];
  currentMatch: MatchFoundInfo | null = null;
  startedMatchId: string | null = null;
  disconnectedClientId: string | null = null;

  constructor(net: NetClient) {
    this.net = net;
  }

  handleMessage(msg: ServerToClientMessage): void {
    if (msg.type === 'LOBBY_CREATED') {
      this.lobbyCode = msg.code;
    }
    if (msg.type === 'LOBBY_JOINED') {
      this.lobbyCode = msg.code;
      this.players = msg.players;
    }
    if (msg.type === 'MATCH_FOUND') {
      this.currentMatch = {
        matchId: msg.matchId,
        hostClientId: msg.hostClientId,
        seed: msg.seed,
        startAtTick: msg.startAtTick
      };
    }
    if (msg.type === 'START_MATCH') {
      this.startedMatchId = msg.matchId;
    }
    if (msg.type === 'PLAYER_DISCONNECTED') {
      this.disconnectedClientId = msg.clientId;
    }
    if (msg.type === 'SNAPSHOT' || msg.type === 'REMOTE_INPUT') {
      this.disconnectedClientId = null;
    }
  }

  createLobby(): void {
    this.net.send({ type: 'CREATE_LOBBY' });
  }

  joinLobby(code: string): void {
    this.net.send({ type: 'JOIN_LOBBY', code: code.trim().toUpperCase() });
  }

  queueMatch(): void {
    this.net.send({ type: 'QUEUE_MATCH' });
  }

  leaveQueue(): void {
    this.net.send({ type: 'LEAVE_QUEUE' });
  }

  ready(matchId: string): void {
    this.net.send({ type: 'READY', matchId });
  }

  reconnectActiveMatch(): void {
    const matchId = this.startedMatchId ?? this.currentMatch?.matchId;
    if (!matchId) {
      return;
    }
    this.net.send({ type: 'RECONNECT', matchId });
  }
}
