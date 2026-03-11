import type { GameRuntimeHooks } from '../../game/modules';
import { createGameShell } from '../../game/createGameShell';
import { AdapterMultiplayerScene } from '../../mp/adapterMultiplayerScene';
import { CardTableScene } from './scene';

export function createGame(target: HTMLDivElement, hooks: GameRuntimeHooks) {
  const scene = hooks.multiplayer ? new AdapterMultiplayerScene({ hooks }) : new CardTableScene({ hooks });
  return createGameShell({
    target,
    scene,
    sceneKey: 'card-table-main',
    backgroundColor: '#162033',
    targetFps: 120
  });
}
