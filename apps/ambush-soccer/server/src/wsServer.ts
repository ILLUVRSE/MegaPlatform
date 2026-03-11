import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, type RawData, type WebSocket } from 'ws';
import {
  type ClientToServerMessage,
  type MatchSnapshotState,
  type QuantizedInput,
  type ServerToClientMessage,
  PROTOCOL_VERSION,
  parseClientMessage,
  serializeMessage
} from './protocol.js';
import { LobbyRegistry } from './lobbies.js';
import { MatchmakingQueue } from './matchmaking.js';
import { MatchRegistry } from './matches.js';
import { TickLoop } from './tickLoop.js';

interface ClientConn {
  clientId: string;
  ws: WebSocket;
  lastMessageAt: number;
  messagesThisSecond: number;
  blockedUntil: number;
}

const RATE_LIMIT_PER_SECOND = 180;
const DISCONNECT_GRACE_MS = 10_000;

export class AmbushWsServer {
  private readonly port: number;
  private readonly server = createServer();
  private readonly wss = new WebSocketServer({ server: this.server, path: '/ws' });
  private readonly clients = new Map<string, ClientConn>();
  private readonly sockets = new Map<WebSocket, string>();
  private readonly lobbies = new LobbyRegistry();
  private readonly queue = new MatchmakingQueue();
  private readonly matches = new MatchRegistry();
  private readonly tickLoop = new TickLoop();

  constructor(port = 8787) {
    this.port = port;
  }

  start(): void {
    this.wss.on('connection', (ws: WebSocket) => this.handleConnection(ws));
    this.server.listen(this.port, () => {
      console.log(`[server] ws listening on :${this.port}/ws`);
    });

    this.tickLoop.start(() => {
      const now = Date.now();
      for (const match of this.matches.all()) {
        for (const [clientId, disconnectedAt] of match.disconnectedAt.entries()) {
          if (now - disconnectedAt < DISCONNECT_GRACE_MS) {
            continue;
          }
          const winner = match.players.find((p) => p !== clientId);
          if (winner) {
            this.send(winner, { type: 'FORFEIT_WIN', matchId: match.id, winnerClientId: winner });
          }
          this.matches.remove(match.id);
          break;
        }
      }
    }, 10);
  }

  private handleConnection(ws: WebSocket): void {
    let initialId = `guest-${randomUUID().slice(0, 8)}`;
    this.sockets.set(ws, initialId);

    ws.on('message', (raw: RawData) => {
      const text = typeof raw === 'string' ? raw : raw.toString('utf8');
      const msg = parseClientMessage(text);
      if (!msg) {
        ws.send(serializeMessage({ type: 'ERROR', code: 'BAD_SCHEMA', message: 'Invalid message schema' }));
        return;
      }

      const currentClientId = this.sockets.get(ws) ?? initialId;
      if (!this.isAllowedRate(currentClientId)) {
        ws.send(serializeMessage({ type: 'ERROR', code: 'RATE_LIMIT', message: 'Too many messages' }));
        return;
      }

      if (msg.type === 'HELLO') {
        const resumeId = msg.resumeClientId;
        if (resumeId && !this.clients.has(resumeId)) {
          initialId = resumeId;
        } else if (!initialId || this.clients.has(initialId)) {
          initialId = `c-${randomUUID().slice(0, 8)}`;
        }

        this.sockets.set(ws, initialId);
        this.clients.set(initialId, {
          clientId: initialId,
          ws,
          lastMessageAt: Date.now(),
          messagesThisSecond: 0,
          blockedUntil: 0
        });
        this.matches.clearDisconnected(initialId);
        ws.send(serializeMessage({ type: 'WELCOME', clientId: initialId, protocolVersion: PROTOCOL_VERSION }));
        return;
      }

      this.routeMessage(currentClientId, msg);
    });

    ws.on('close', () => {
      const clientId = this.sockets.get(ws);
      if (!clientId) {
        return;
      }
      this.sockets.delete(ws);
      this.clients.delete(clientId);
      this.queue.remove(clientId);
      this.lobbies.removeByClient(clientId);
      const match = this.matches.markDisconnected(clientId);
      if (match) {
        const opponent = match.players.find((p) => p !== clientId);
        if (opponent) {
          this.send(opponent, { type: 'PLAYER_DISCONNECTED', clientId });
        }
      }
    });
  }

  private routeMessage(clientId: string, msg: ClientToServerMessage): void {
    switch (msg.type) {
      case 'CREATE_LOBBY': {
        const lobby = this.lobbies.create(clientId);
        this.send(clientId, { type: 'LOBBY_CREATED', code: lobby.code, lobbyId: lobby.id });
        this.send(clientId, { type: 'LOBBY_JOINED', code: lobby.code, players: lobby.players });
        return;
      }
      case 'JOIN_LOBBY': {
        const lobby = this.lobbies.join(msg.code, clientId);
        if (!lobby) {
          this.send(clientId, { type: 'ERROR', code: 'JOIN_FAILED', message: 'Lobby not found or full' });
          return;
        }
        for (const p of lobby.players) {
          this.send(p, { type: 'LOBBY_JOINED', code: lobby.code, players: lobby.players });
        }
        if (lobby.players.length === 2) {
          const session = this.matches.create(lobby.players[0], lobby.players[1]);
          this.lobbies.delete(lobby.code);
          for (const p of session.players) {
            this.send(p, {
              type: 'MATCH_FOUND',
              matchId: session.id,
              hostClientId: session.hostClientId,
              seed: Math.floor(Math.random() * 1_000_000),
              startAtTick: 0
            });
          }
        }
        return;
      }
      case 'QUEUE_MATCH': {
        this.queue.enqueue(clientId);
        const pair = this.queue.popPair();
        if (!pair) {
          return;
        }
        const session = this.matches.create(pair[0], pair[1]);
        for (const p of session.players) {
          this.send(p, {
            type: 'MATCH_FOUND',
            matchId: session.id,
            hostClientId: session.hostClientId,
            seed: Math.floor(Math.random() * 1_000_000),
            startAtTick: 0
          });
        }
        return;
      }
      case 'LEAVE_QUEUE': {
        this.queue.dequeue(clientId);
        return;
      }
      case 'READY': {
        const allReady = this.matches.markReady(msg.matchId, clientId);
        if (allReady) {
          const match = this.matches.getById(msg.matchId);
          if (match) {
            for (const p of match.players) {
              this.send(p, { type: 'START_MATCH', matchId: msg.matchId });
            }
          }
        }
        return;
      }
      case 'INPUT': {
        const match = this.matches.getById(msg.matchId);
        if (!match || !match.players.includes(clientId)) {
          return;
        }
        const host = match.hostClientId;
        if (clientId === host) {
          return;
        }
        const payload: QuantizedInput = {
          clientTick: msg.clientTick,
          seq: msg.seq,
          inputBits: msg.inputBits,
          moveX: msg.moveX,
          moveY: msg.moveY,
          shootCharge: msg.shootCharge
        };
        this.send(host, { type: 'REMOTE_INPUT', matchId: msg.matchId, fromClientId: clientId, payload });
        return;
      }
      case 'HOST_SNAPSHOT': {
        const match = this.matches.getById(msg.matchId);
        if (!match || match.hostClientId !== clientId) {
          return;
        }
        for (const p of match.players) {
          this.send(p, { type: 'SNAPSHOT', matchId: msg.matchId, serverTick: msg.serverTick, state: msg.state as MatchSnapshotState });
        }
        return;
      }
      case 'RECONNECT': {
        const match = this.matches.getById(msg.matchId);
        if (!match || !match.players.includes(clientId)) {
          return;
        }
        this.matches.clearDisconnected(clientId);
        return;
      }
      case 'PING': {
        this.send(clientId, { type: 'PONG', t: msg.t });
        return;
      }
      default:
        return;
    }
  }

  private send(clientId: string, msg: ServerToClientMessage): void {
    const conn = this.clients.get(clientId);
    if (!conn) {
      return;
    }
    conn.ws.send(serializeMessage(msg));
  }

  private isAllowedRate(clientId: string): boolean {
    const conn = this.clients.get(clientId);
    if (!conn) {
      return true;
    }
    const now = Date.now();
    if (now < conn.blockedUntil) {
      return false;
    }
    if (now - conn.lastMessageAt > 1000) {
      conn.lastMessageAt = now;
      conn.messagesThisSecond = 1;
      return true;
    }
    conn.messagesThisSecond += 1;
    if (conn.messagesThisSecond > RATE_LIMIT_PER_SECOND) {
      conn.blockedUntil = now + 2000;
      return false;
    }
    return true;
  }
}
