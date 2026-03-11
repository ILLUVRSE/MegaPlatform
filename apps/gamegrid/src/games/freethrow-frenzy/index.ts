import type { GameRuntimeHooks } from '../../game/modules';
import { createGameShell } from '../../game/createGameShell';
import { AdapterMultiplayerScene } from '../../mp/adapterMultiplayerScene';
import { FreethrowFrenzyScene } from './scene';

export function createGame(target: HTMLDivElement, hooks: GameRuntimeHooks) {
  const scene = hooks.multiplayer ? new AdapterMultiplayerScene({ hooks }) : new FreethrowFrenzyScene({ hooks });
  return createGameShell({
    target,
    scene,
    sceneKey: 'freethrow-frenzy-main',
    backgroundColor: '#121220',
    targetFps: 120
  });
}
