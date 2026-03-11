import { describe, expect, it } from 'vitest';
import { MP_PROTOCOL_VERSION, createProtocolMessage, validateProtocolMessage } from './protocol';

describe('mp protocol', () => {
  it('creates messages with correct version', () => {
    const message = createProtocolMessage('start', { gameId: 'pixelpuck', seed: 42 });
    expect(message.v).toBe(MP_PROTOCOL_VERSION);
    expect(validateProtocolMessage(message)).toBe(true);
  });

  it('rejects unknown version', () => {
    const candidate = {
      v: MP_PROTOCOL_VERSION + 1,
      type: 'ready',
      ts: Date.now(),
      playerId: 'p1',
      ready: true
    };

    expect(validateProtocolMessage(candidate)).toBe(false);
  });

  it('rejects malformed payload', () => {
    const candidate = {
      v: MP_PROTOCOL_VERSION,
      type: 'snapshot',
      ts: Date.now(),
      tick: 'bad'
    };

    expect(validateProtocolMessage(candidate)).toBe(false);
  });
});
