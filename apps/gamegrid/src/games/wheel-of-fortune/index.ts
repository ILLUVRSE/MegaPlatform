import type { GameRuntimeHooks } from '../../game/modules';
import { createGameShell } from '../../game/createGameShell';
import { AdapterMultiplayerScene } from '../../mp/adapterMultiplayerScene';
import { WheelOfFortuneScene } from './scene';

export function createGame(target: HTMLDivElement, hooks: GameRuntimeHooks) {
  const scene = hooks.multiplayer ? new AdapterMultiplayerScene({ hooks }) : new WheelOfFortuneScene({ hooks });
  return createGameShell({
    target,
    scene,
    sceneKey: 'wheel-of-fortune-main',
    backgroundColor: '#0f1f2f',
    targetFps: 120
  });
}
