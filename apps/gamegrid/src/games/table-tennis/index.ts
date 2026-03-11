import type { GameRuntimeHooks } from '../../game/modules';
import { createGameShell } from '../../game/createGameShell';
import { TableTennisMultiplayerScene } from './multiplayerScene';
import { TableTennisScene } from './scene';

export function createGame(target: HTMLDivElement, hooks: GameRuntimeHooks) {
  const scene = hooks.multiplayer ? new TableTennisMultiplayerScene({ hooks }) : new TableTennisScene({ hooks });
  return createGameShell({
    target,
    scene,
    sceneKey: 'table-tennis-main',
    backgroundColor: '#10263d',
    targetFps: 144
  });
}
