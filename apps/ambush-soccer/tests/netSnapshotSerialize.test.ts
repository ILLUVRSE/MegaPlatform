import { describe, expect, it } from 'vitest';
import { serializeMessage, parseServerMessage } from '../src/shared/net/serialize';

describe('snapshot serialization', () => {
  it('encodes and decodes snapshot payload', () => {
    const msg = {
      type: 'SNAPSHOT' as const,
      matchId: 'm1',
      serverTick: 42,
      state: {
        players: [],
        ball: { x: 1, y: 2, vx: 3, vy: 4, ownerId: null },
        homeScore: 1,
        awayScore: 0,
        timeRemainingSec: 120,
        inOvertime: false,
        checksum: 123
      }
    };
    const wire = serializeMessage(msg);
    const parsed = parseServerMessage(wire);
    expect(parsed?.type).toBe('SNAPSHOT');
    if (parsed?.type === 'SNAPSHOT') {
      expect(parsed.serverTick).toBe(42);
      expect(parsed.state.ball.x).toBe(1);
    }
  });
});
