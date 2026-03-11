import type { RodRole, RodSelectionState, RodState, TableBounds, TeamSide } from './types';

const ROLE_ORDER: readonly RodRole[] = ['goalkeeper', 'defense', 'midfield', 'strikers'] as const;

const PLAYER_OFFSETS: Record<RodRole, readonly number[]> = {
  goalkeeper: [0],
  defense: [-96, 96],
  midfield: [-180, -90, 0, 90, 180],
  strikers: [-120, 0, 120]
};

const ROD_SPEED = 620;

function laneX(bounds: TableBounds, team: TeamSide, role: RodRole): number {
  const width = bounds.right - bounds.left;
  const padding = width * 0.08;
  const step = (width - padding * 2) / 7;
  const roleIndex = ROLE_ORDER.indexOf(role);
  const lane = team === 'player' ? 1 + roleIndex : 6 - roleIndex;
  return bounds.left + padding + step * lane;
}

export function createRods(bounds: TableBounds, team: TeamSide): RodState[] {
  const rods: RodState[] = [];
  for (let i = 0; i < ROLE_ORDER.length; i += 1) {
    const role = ROLE_ORDER[i];
    const manOffsets = PLAYER_OFFSETS[role];
    const rod: RodState = {
      index: i,
      team,
      role,
      x: laneX(bounds, team, role),
      y: bounds.centerY,
      targetY: bounds.centerY,
      minY: bounds.top + 56,
      maxY: bounds.bottom - 56,
      speed: ROD_SPEED,
      selected: false,
      locked: false,
      manOffsets,
      manualUntilMs: 0,
      players: []
    };

    for (let j = 0; j < manOffsets.length; j += 1) {
      rod.players.push({
        x: rod.x,
        y: rod.y + manOffsets[j],
        radius: 20,
        team,
        rodIndex: i,
        role
      });
    }

    rods.push(rod);
  }
  return rods;
}

export function syncRodPlayers(rod: RodState): void {
  for (let i = 0; i < rod.players.length; i += 1) {
    const player = rod.players[i];
    player.x = rod.x;
    player.y = rod.y + rod.manOffsets[i];
  }
}

export function clampRodY(rod: RodState, nextY: number): number {
  let minY = rod.minY;
  let maxY = rod.maxY;

  for (let i = 0; i < rod.manOffsets.length; i += 1) {
    const offset = rod.manOffsets[i];
    minY = Math.max(minY, rod.minY - offset + 24);
    maxY = Math.min(maxY, rod.maxY - offset - 24);
  }

  return Math.max(minY, Math.min(maxY, nextY));
}

export function moveRodByDelta(rod: RodState, deltaY: number): void {
  if (rod.locked) return;
  rod.targetY = clampRodY(rod, rod.targetY + deltaY);
}

export function stepRodMovement(rod: RodState, dt: number): void {
  if (rod.locked) return;
  const delta = rod.targetY - rod.y;
  if (Math.abs(delta) < 0.0001) return;
  const maxStep = rod.speed * dt;
  const step = Math.abs(delta) <= maxStep ? delta : Math.sign(delta) * maxStep;
  rod.y = clampRodY(rod, rod.y + step);
  syncRodPlayers(rod);
}

export function roleLabel(role: RodRole): string {
  if (role === 'goalkeeper') return 'Goalkeeper';
  if (role === 'defense') return 'Defense';
  if (role === 'midfield') return 'Midfield';
  return 'Strikers';
}

export function selectRod(selection: RodSelectionState, rods: RodState[], index: number): void {
  const clamped = Math.max(0, Math.min(rods.length - 1, index));
  selection.selectedIndex = clamped;
  for (let i = 0; i < rods.length; i += 1) {
    rods[i].selected = i === clamped;
  }
}

export function autoSelectRodIndex(ballX: number, rods: readonly RodState[]): number {
  if (rods.length < 4) return 0;
  const b01 = (rods[0].x + rods[1].x) * 0.5;
  const b12 = (rods[1].x + rods[2].x) * 0.5;
  const b23 = (rods[2].x + rods[3].x) * 0.5;
  if (ballX < b01) return 0;
  if (ballX < b12) return 1;
  if (ballX < b23) return 2;
  return 3;
}

export function updateRodSelection(
  selection: RodSelectionState,
  rods: RodState[],
  ballX: number,
  nowMs: number,
  autoSelect: boolean
): void {
  if (autoSelect && nowMs >= selection.manualUntilMs) {
    const nextIndex = autoSelectRodIndex(ballX, rods);
    selectRod(selection, rods, nextIndex);
  } else {
    selectRod(selection, rods, selection.selectedIndex);
  }
}

export function setManualSelection(
  selection: RodSelectionState,
  rods: RodState[],
  index: number,
  nowMs: number,
  holdMs = 2000
): void {
  selection.manualUntilMs = nowMs + holdMs;
  selectRod(selection, rods, index);
}

export function findClosestRodIndexByX(rods: readonly RodState[], x: number, tolerance = 34): number | null {
  let closestIdx = -1;
  let closestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < rods.length; i += 1) {
    const dist = Math.abs(rods[i].x - x);
    if (dist < closestDist) {
      closestDist = dist;
      closestIdx = i;
    }
  }
  if (closestIdx < 0 || closestDist > tolerance) return null;
  return closestIdx;
}

export function applyLockedRoles(rods: RodState[], activeRoles: readonly RodRole[], lockedRoles: readonly RodRole[]): void {
  for (let i = 0; i < rods.length; i += 1) {
    const rod = rods[i];
    const isActive = activeRoles.includes(rod.role);
    const isLocked = lockedRoles.includes(rod.role) || !isActive;
    rod.locked = isLocked;
  }
}
