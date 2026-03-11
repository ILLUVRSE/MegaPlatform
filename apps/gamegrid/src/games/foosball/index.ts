import type { GameRuntimeHooks } from '../../game/modules';
import { createGameShell } from '../../game/createGameShell';
import { AdapterMultiplayerScene } from '../../mp/adapterMultiplayerScene';
import { FoosballScene } from './scene';

export function createGame(target: HTMLDivElement, hooks: GameRuntimeHooks) {
  const scene = hooks.multiplayer ? new AdapterMultiplayerScene({ hooks }) : new FoosballScene({ hooks });
  return createGameShell({
    target,
    scene,
    sceneKey: 'foosball-main',
    backgroundColor: '#0d2318',
    targetFps: 144
  });
}
