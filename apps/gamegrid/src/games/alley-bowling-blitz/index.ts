import type { GameRuntimeHooks } from '../../game/modules';
import { createGameShell } from '../../game/createGameShell';
import { AdapterMultiplayerScene } from '../../mp/adapterMultiplayerScene';
import { AlleyBowlingBlitzScene } from './scene';

export function createGame(target: HTMLDivElement, hooks: GameRuntimeHooks) {
  const scene = hooks.multiplayer ? new AdapterMultiplayerScene({ hooks }) : new AlleyBowlingBlitzScene({ hooks });
  return createGameShell({
    target,
    scene,
    sceneKey: 'alley-bowling-blitz-main',
    backgroundColor: '#1c1e2f',
    targetFps: 120
  });
}
