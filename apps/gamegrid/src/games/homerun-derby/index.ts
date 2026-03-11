import type { GameRuntimeHooks } from '../../game/modules';
import { createGameShell } from '../../game/createGameShell';
import { AdapterMultiplayerScene } from '../../mp/adapterMultiplayerScene';
import { HomerunDerbyScene } from './scene';

export function createGame(target: HTMLDivElement, hooks: GameRuntimeHooks) {
  const scene = hooks.multiplayer ? new AdapterMultiplayerScene({ hooks }) : new HomerunDerbyScene({ hooks });
  return createGameShell({
    target,
    scene,
    sceneKey: 'homerun-derby-main',
    backgroundColor: '#181327',
    targetFps: 120
  });
}
