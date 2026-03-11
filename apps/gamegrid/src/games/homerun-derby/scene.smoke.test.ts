import { describe, expect, it } from 'vitest';
import { createGame } from './index';

const hooks = {
  gameId: 'homerun-derby',
  backToLobby: () => undefined,
  reportEvent: () => undefined
};

describe('homerun-derby smoke', () => {
  it('creates a game engine handle for /play/homerun-derby', () => {
    const target = document.createElement('div');
    const engine = createGame(target, hooks);
    expect(engine).toBeTruthy();
    expect(typeof engine.init).toBe('function');
    expect(typeof engine.start).toBe('function');
    engine.destroy();
  });
});
