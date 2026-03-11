import { describe, expect, it } from 'vitest';
import { generateLobbyCode } from '../src/shared/net/lobbyCode';

describe('lobby code generation', () => {
  it('generates short uppercase codes', () => {
    const code = generateLobbyCode(() => 0.1, 6);
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[A-Z2-9]+$/);
  });

  it('is usually unique across sample set', () => {
    const set = new Set<string>();
    for (let i = 0; i < 2000; i += 1) {
      set.add(generateLobbyCode());
    }
    expect(set.size).toBeGreaterThan(1950);
  });
});
