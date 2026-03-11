import type { GameRuntimeHooks } from '../../game/modules';
import { createGameShell } from '../../game/createGameShell';
import { AdapterMultiplayerScene } from '../../mp/adapterMultiplayerScene';
import { GoalieGauntletScene } from './scene';

export function createGame(target: HTMLDivElement, hooks: GameRuntimeHooks) {
  const scene = hooks.multiplayer ? new AdapterMultiplayerScene({ hooks }) : new GoalieGauntletScene({ hooks });
  return createGameShell({
    target,
    scene,
    sceneKey: 'goalie-gauntlet-main',
    backgroundColor: '#0b1c34',
    targetFps: 60
  });
}
