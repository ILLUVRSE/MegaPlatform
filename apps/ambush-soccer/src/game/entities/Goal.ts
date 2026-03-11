import type { GoalRect, TeamSide } from '../../shared/types';

export class Goal {
  rect: GoalRect;

  constructor(x: number, y: number, width: number, height: number, team: TeamSide) {
    this.rect = { x, y, width, height, team };
  }
}
