import type { GameRuntimeHooks } from '../../game/modules';
import { createGameShell } from '../../game/createGameShell';
import { AdapterMultiplayerScene } from '../../mp/adapterMultiplayerScene';
import { PoolScene } from './scene';

export function createGame(target: HTMLDivElement, hooks: GameRuntimeHooks) {
  const scene = hooks.multiplayer ? new AdapterMultiplayerScene({ hooks }) : new PoolScene({ hooks });
  return createGameShell({
    target,
    scene,
    sceneKey: 'pool-main',
    backgroundColor: '#082619',
    targetFps: 120
  });
}
