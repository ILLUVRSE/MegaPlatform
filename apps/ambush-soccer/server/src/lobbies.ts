import { randomUUID } from 'node:crypto';
import { generateLobbyCode } from '../../src/shared/net/lobbyCode.js';

export interface Lobby {
  id: string;
  code: string;
  hostClientId: string;
  players: string[];
}

export class LobbyRegistry {
  private byCode = new Map<string, Lobby>();

  create(hostClientId: string): Lobby {
    let code = generateLobbyCode();
    while (this.byCode.has(code)) {
      code = generateLobbyCode();
    }
    const lobby: Lobby = {
      id: randomUUID(),
      code,
      hostClientId,
      players: [hostClientId]
    };
    this.byCode.set(code, lobby);
    return lobby;
  }

  get(code: string): Lobby | undefined {
    return this.byCode.get(code.toUpperCase());
  }

  join(code: string, clientId: string): Lobby | null {
    const lobby = this.get(code);
    if (!lobby) {
      return null;
    }
    if (lobby.players.includes(clientId)) {
      return lobby;
    }
    if (lobby.players.length >= 2) {
      return null;
    }
    lobby.players.push(clientId);
    return lobby;
  }

  removeByClient(clientId: string): void {
    for (const [code, lobby] of this.byCode.entries()) {
      if (!lobby.players.includes(clientId)) {
        continue;
      }
      lobby.players = lobby.players.filter((p) => p !== clientId);
      if (lobby.players.length === 0) {
        this.byCode.delete(code);
      } else if (lobby.hostClientId === clientId) {
        lobby.hostClientId = lobby.players[0];
      }
    }
  }

  delete(code: string): void {
    this.byCode.delete(code);
  }
}
