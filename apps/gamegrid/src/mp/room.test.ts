import { describe, expect, it } from 'vitest';
import { RoomStateMachine } from './room';

describe('room state transitions', () => {
  it('supports create join ready and start flow', () => {
    const room = new RoomStateMachine('host-1', 'Host', 'ABCD', 123);

    room.joinPlayer('p2', 'Guest');
    room.setReady('host-1', true);
    room.setReady('p2', true);

    expect(room.canStart()).toBe(true);

    const started = room.start('host-1');
    expect(started.started).toBe(true);
    expect(started.startedAt).toBeTypeOf('number');
    expect(started.selectedGameId).toBe('pixelpuck');
  });

  it('requires host to start and game select', () => {
    const room = new RoomStateMachine('host-1', 'Host', 'ABCD', 123);
    room.joinPlayer('p2', 'Guest');

    expect(() => room.selectGame('minigolf', 'p2')).toThrow(/only host/i);
    expect(() => room.start('p2')).toThrow(/only host/i);
  });

  it('resets ready states when returning to lobby', () => {
    const room = new RoomStateMachine('host-1', 'Host', 'ABCD', 123);
    room.joinPlayer('p2', 'Guest');
    room.setReady('host-1', true);
    room.setReady('p2', true);
    room.start('host-1');

    const lobby = room.returnToLobby('host-1');
    expect(lobby.started).toBe(false);
    expect(lobby.players.every((player) => player.ready === false)).toBe(true);
  });

  it('promotes next player when host leaves', () => {
    const room = new RoomStateMachine('host-1', 'Host', 'ABCD', 123);
    room.joinPlayer('p2', 'Guest');
    room.joinPlayer('p3', 'Guest2');

    room.removePlayer('host-1');
    const snapshot = room.snapshot();
    expect(snapshot.hostId).toBe('p2');
    expect(snapshot.players.map((p) => p.id)).toEqual(['p2', 'p3']);
  });

  it('clears ready when a player disconnects and blocks start', () => {
    const room = new RoomStateMachine('host-1', 'Host', 'ABCD', 123);
    room.joinPlayer('p2', 'Guest');
    room.setReady('host-1', true);
    room.setReady('p2', true);
    expect(room.canStart()).toBe(true);

    room.setConnected('p2', false);
    const snapshot = room.snapshot();
    expect(snapshot.players.find((p) => p.id === 'p2')?.ready).toBe(false);
    expect(room.canStart()).toBe(false);
  });
});
