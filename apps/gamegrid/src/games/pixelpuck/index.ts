import type { GameRuntimeHooks } from '../../game/modules';
import { createGameShell } from '../../game/createGameShell';
import { PixelPuckScene } from './scene';
import { PixelPuckMultiplayerScene } from './multiplayerScene';

export function createGame(target: HTMLDivElement, hooks: GameRuntimeHooks) {
  const scene = hooks.multiplayer ? new PixelPuckMultiplayerScene({ hooks }) : new PixelPuckScene({ hooks });
  return createGameShell({
    target,
    scene,
    sceneKey: 'pixelpuck-main',
    backgroundColor: '#041521',
    targetFps: 60
  });
}
