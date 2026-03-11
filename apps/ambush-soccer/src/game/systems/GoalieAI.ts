import { clamp, normalize } from '../../shared/math';
import { TUNING } from '../config/tuning';
import { Ball } from '../entities/Ball';
import { Player } from '../entities/Player';
import type { TeamSide } from '../../shared/types';

export class GoalieAI {
  private reactionTimers = new Map<string, number>();

  update(goalie: Player, ball: Ball, dt: number, onSave: (team: TeamSide) => void): void {
    if (!goalie.isGoalie) {
      return;
    }

    const key = goalie.id;
    const current = this.reactionTimers.get(key) ?? 0;
    const next = Math.max(0, current - dt);
    this.reactionTimers.set(key, next);

    const goalLineX = goalie.team === 'home' ? 36 : TUNING.arena.width - 36;
    const minY = TUNING.arena.height / 2 - TUNING.arena.goalHeight / 2;
    const maxY = TUNING.arena.height / 2 + TUNING.arena.goalHeight / 2;

    let targetY = clamp(ball.position.y, minY, maxY);
    if (next > 0) {
      targetY = goalie.position.y;
    }

    const dir = normalize({ x: goalLineX - goalie.position.x, y: targetY - goalie.position.y });
    goalie.velocity.x += dir.x * TUNING.ai.goalieTrackSpeed * dt;
    goalie.velocity.y += dir.y * TUNING.ai.goalieTrackSpeed * dt;

    const corridorHit =
      Math.abs(ball.position.y - goalie.position.y) < TUNING.ai.goalieCorridorHalfHeight &&
      Math.abs(ball.position.x - goalie.position.x) < TUNING.ai.goalieSaveRadius;

    if (corridorHit) {
      onSave(goalie.team);
      const clearDir = goalie.team === 'home' ? 1 : -1;
      ball.velocity.x = clearDir * TUNING.ai.goalieClearSpeed;
      ball.velocity.y = (Math.random() - 0.5) * 180;
      this.reactionTimers.set(key, TUNING.ai.goalieReactionDelaySec);
    }
  }
}
