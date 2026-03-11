import { randomUUID } from 'node:crypto';

export interface MatchSession {
  id: string;
  players: [string, string];
  hostClientId: string;
  ready: Set<string>;
  disconnectedAt: Map<string, number>;
}

export class MatchRegistry {
  private matches = new Map<string, MatchSession>();
  private byClient = new Map<string, string>();

  create(playerA: string, playerB: string): MatchSession {
    const session: MatchSession = {
      id: randomUUID(),
      players: [playerA, playerB],
      hostClientId: playerA,
      ready: new Set(),
      disconnectedAt: new Map()
    };
    this.matches.set(session.id, session);
    this.byClient.set(playerA, session.id);
    this.byClient.set(playerB, session.id);
    return session;
  }

  getById(matchId: string): MatchSession | undefined {
    return this.matches.get(matchId);
  }

  getByClient(clientId: string): MatchSession | undefined {
    const id = this.byClient.get(clientId);
    return id ? this.matches.get(id) : undefined;
  }

  markReady(matchId: string, clientId: string): boolean {
    const match = this.matches.get(matchId);
    if (!match || !match.players.includes(clientId)) {
      return false;
    }
    match.ready.add(clientId);
    return match.ready.size === 2;
  }

  markDisconnected(clientId: string): MatchSession | undefined {
    const match = this.getByClient(clientId);
    if (!match) {
      return undefined;
    }
    match.disconnectedAt.set(clientId, Date.now());
    return match;
  }

  clearDisconnected(clientId: string): MatchSession | undefined {
    const match = this.getByClient(clientId);
    if (!match) {
      return undefined;
    }
    match.disconnectedAt.delete(clientId);
    return match;
  }

  getOpponent(matchId: string, clientId: string): string | null {
    const match = this.matches.get(matchId);
    if (!match) {
      return null;
    }
    return match.players.find((p) => p !== clientId) ?? null;
  }

  remove(matchId: string): void {
    const match = this.matches.get(matchId);
    if (!match) {
      return;
    }
    for (const player of match.players) {
      this.byClient.delete(player);
    }
    this.matches.delete(matchId);
  }

  all(): MatchSession[] {
    return [...this.matches.values()];
  }
}
