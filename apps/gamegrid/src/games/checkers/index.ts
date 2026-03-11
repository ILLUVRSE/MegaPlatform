import type { GameRuntimeHooks } from '../../game/modules';
import { createGameShell } from '../../game/createGameShell';
import { AdapterMultiplayerScene } from '../../mp/adapterMultiplayerScene';
import { CheckersScene } from './scene';

export function createGame(target: HTMLDivElement, hooks: GameRuntimeHooks) {
  const scene = hooks.multiplayer ? new AdapterMultiplayerScene({ hooks }) : new CheckersScene({ hooks });
  return createGameShell({
    target,
    scene,
    sceneKey: 'checkers-main',
    backgroundColor: '#15110f',
    targetFps: 120
  });
}
