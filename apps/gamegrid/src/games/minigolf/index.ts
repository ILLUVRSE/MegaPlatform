import type { GameRuntimeHooks } from '../../game/modules';
import { createGameShell } from '../../game/createGameShell';
import { AdapterMultiplayerScene } from '../../mp/adapterMultiplayerScene';
import { MinigolfScene } from './scene';

export function createGame(target: HTMLDivElement, hooks: GameRuntimeHooks) {
  const scene = hooks.multiplayer ? new AdapterMultiplayerScene({ hooks }) : new MinigolfScene({ hooks });
  return createGameShell({
    target,
    scene,
    sceneKey: 'minigolf-main',
    backgroundColor: '#0a1c1c',
    targetFps: 120
  });
}
