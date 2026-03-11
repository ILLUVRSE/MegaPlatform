import type { GameRuntimeHooks } from '../../game/modules';
import { createGameShell } from '../../game/createGameShell';
import { DrawOnAPotatoScene } from './scene';

export function createGame(target: HTMLDivElement, hooks: GameRuntimeHooks) {
  const scene = new DrawOnAPotatoScene({ hooks });
  return createGameShell({
    target,
    scene,
    sceneKey: 'draw-on-a-potato-main',
    backgroundColor: '#f7f0df',
    targetFps: 120
  });
}
