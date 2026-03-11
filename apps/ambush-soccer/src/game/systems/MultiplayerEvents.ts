// TODO (phase 2+): networked multiplayer event contracts.
export interface MultiplayerInputEvent {
  playerId: string;
  tick: number;
  moveX: number;
  moveY: number;
  sprint: boolean;
  pass: boolean;
  shoot: boolean;
  switchPlayer: boolean;
  tackle: boolean;
}

// TODO (phase 2+): rollback/reconciliation hooks.
export interface MultiplayerSnapshotEvent {
  tick: number;
  ball: { x: number; y: number; vx: number; vy: number };
  players: Array<{ id: string; x: number; y: number; vx: number; vy: number }>;
}
