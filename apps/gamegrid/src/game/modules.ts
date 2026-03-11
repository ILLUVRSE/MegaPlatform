import type { GameEngine } from './engine';
import type { ChildEvent } from '../systems/postMessageBridge';
import type { MultiplayerLaunchContext } from '../mp/session';

export type GameEventPayload = ChildEvent;

export interface GameRuntimeHooks {
  gameId: string;
  reportEvent: (payload: GameEventPayload) => void;
  backToLobby: () => void;
  multiplayer?: MultiplayerLaunchContext;
}

export interface LoadedGameModule {
  createSceneLabel?: () => string;
  createGame?: (target: HTMLDivElement, hooks: GameRuntimeHooks) => GameEngine;
}
