import type { GameRuntimeHooks } from '../../game/modules';
import { createGameShell } from '../../game/createGameShell';
import { AdapterMultiplayerScene } from '../../mp/adapterMultiplayerScene';
import { PenaltyKickShowdownScene } from './scene';

export function createGame(target: HTMLDivElement, hooks: GameRuntimeHooks) {
  const scene = hooks.multiplayer ? new AdapterMultiplayerScene({ hooks }) : new PenaltyKickShowdownScene({ hooks });
  return createGameShell({
    target,
    scene,
    sceneKey: 'penalty-kick-showdown-main',
    backgroundColor: '#102712',
    targetFps: 120
  });
}
