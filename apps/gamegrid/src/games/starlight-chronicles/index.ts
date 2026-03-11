import type { GameRuntimeHooks } from '../../game/modules';
import { createGameShell } from '../../game/createGameShell';
import { createStarlightVerticalSliceGame } from '../../scenes/starlightLauncher';
import { StarlightChroniclesMultiplayerScene } from './multiplayerScene';

export function createGame(target: HTMLDivElement, hooks: GameRuntimeHooks) {
  if (hooks.multiplayer) {
    const scene = new StarlightChroniclesMultiplayerScene({ hooks });
    return createGameShell({
      target,
      scene,
      sceneKey: 'starlight-chronicles-main',
      backgroundColor: '#071120',
      targetFps: 60
    });
  }
  return createStarlightVerticalSliceGame(target, hooks);
}
