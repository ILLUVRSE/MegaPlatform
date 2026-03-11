import { describe, expect, it } from 'vitest';
import { createProtocolMessage } from './protocol';
import { SERIALIZER_LIMIT_BYTES, deserializeMessage, serializeMessage } from './serializer';

describe('serializer safety', () => {
  it('roundtrips valid protocol messages', () => {
    const message = createProtocolMessage('ready', { playerId: 'p1', ready: true });
    const encoded = serializeMessage(message);
    const decoded = deserializeMessage(encoded);

    expect(decoded.type).toBe('ready');
    if (decoded.type !== 'ready') {
      throw new Error('expected ready message');
    }
    expect(decoded.playerId).toBe('p1');
  });

  it('rejects huge payloads', () => {
    const huge = 'x'.repeat(SERIALIZER_LIMIT_BYTES + 20);
    expect(() => deserializeMessage(huge)).toThrow(/payload too large/i);
  });

  it('rejects invalid protocol payload', () => {
    const invalid = JSON.stringify({ nope: true });
    expect(() => deserializeMessage(invalid)).toThrow(/invalid protocol/i);
  });
});
