import type { TeamSide, Vec2 } from '../../shared/types';

export class Player {
  id: string;
  team: TeamSide;
  position: Vec2;
  velocity: Vec2;
  facing: Vec2;
  radius: number;
  isHumanControlled = false;
  controllerSlot: 0 | 1 | null = null;
  stamina = 100;
  tackleCooldown = 0;
  shootChargeSec = 0;
  isGoalie = false;

  constructor(id: string, team: TeamSide, x: number, y: number, radius: number) {
    this.id = id;
    this.team = team;
    this.position = { x, y };
    this.velocity = { x: 0, y: 0 };
    this.facing = { x: team === 'home' ? 1 : -1, y: 0 };
    this.radius = radius;
  }

  setPosition(x: number, y: number): void {
    this.position.x = x;
    this.position.y = y;
  }
}
