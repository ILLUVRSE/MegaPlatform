import type { GameRuntimeHooks } from '../../game/modules';
import { createGameShell } from '../../game/createGameShell';
import { AdapterMultiplayerScene } from '../../mp/adapterMultiplayerScene';
import { ThrowDartsScene } from './scene';

export function createGame(target: HTMLDivElement, hooks: GameRuntimeHooks) {
  const scene = hooks.multiplayer ? new AdapterMultiplayerScene({ hooks }) : new ThrowDartsScene({ hooks });
  return createGameShell({
    target,
    scene,
    sceneKey: 'throw-darts-main',
    backgroundColor: '#131218',
    targetFps: 60
  });
}
