import type { GameRuntimeHooks } from '../../game/modules';
import { createGameShell } from '../../game/createGameShell';
import { AdapterMultiplayerScene } from '../../mp/adapterMultiplayerScene';
import { OzarkFishingScene } from './scene';

export function createGame(target: HTMLDivElement, hooks: GameRuntimeHooks) {
  const scene = hooks.multiplayer ? new AdapterMultiplayerScene({ hooks }) : new OzarkFishingScene({ hooks });
  return createGameShell({
    target,
    scene,
    sceneKey: 'ozark-fishing-main',
    backgroundColor: '#0a2030',
    targetFps: 120
  });
}
