import type { GameRuntimeHooks } from '../../game/modules';
import { createGameShell } from '../../game/createGameShell';
import { AdapterMultiplayerScene } from '../../mp/adapterMultiplayerScene';
import { OzChronicleScene } from './scene';

export function createGame(target: HTMLDivElement, hooks: GameRuntimeHooks) {
  const scene = hooks.multiplayer ? new AdapterMultiplayerScene({ hooks }) : new OzChronicleScene({ hooks });
  return createGameShell({
    target,
    scene,
    sceneKey: 'oz-chronicle-main',
    backgroundColor: '#f2ead8',
    targetFps: 60
  });
}
