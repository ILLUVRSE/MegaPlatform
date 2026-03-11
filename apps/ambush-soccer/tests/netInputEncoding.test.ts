import { describe, expect, it } from 'vitest';
import { decodeInputBits, dequantizeAxis, encodeInputBits, quantizeAxis } from '../src/shared/net/protocol';

describe('input bit packing', () => {
  it('packs and unpacks button flags', () => {
    const bits = encodeInputBits({
      sprint: true,
      pass: false,
      shoot: true,
      tackle: true,
      switchPlayer: false,
      shootRelease: true
    });
    const decoded = decodeInputBits(bits);
    expect(decoded).toEqual({
      sprint: true,
      pass: false,
      shoot: true,
      tackle: true,
      switchPlayer: false,
      shootRelease: true
    });
  });

  it('quantizes and dequantizes axis', () => {
    const q = quantizeAxis(0.5);
    expect(q).toBeGreaterThan(60);
    expect(dequantizeAxis(q)).toBeCloseTo(0.5, 1);
  });
});
