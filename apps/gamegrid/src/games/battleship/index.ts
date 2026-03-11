import type { GameRuntimeHooks } from '../../game/modules';
import { createGameShell } from '../../game/createGameShell';
import { AdapterMultiplayerScene } from '../../mp/adapterMultiplayerScene';
import { BattleshipScene } from './scene';

export function createGame(target: HTMLDivElement, hooks: GameRuntimeHooks) {
  const scene = hooks.multiplayer ? new AdapterMultiplayerScene({ hooks }) : new BattleshipScene({ hooks });
  return createGameShell({
    target,
    scene,
    sceneKey: 'battleship-main',
    backgroundColor: '#061d29',
    targetFps: 120
  });
}
