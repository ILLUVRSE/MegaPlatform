import { TUNING } from '../config/tuning';
import { distance, normalize } from '../../shared/math';
import { Player } from '../entities/Player';
import { Ball } from '../entities/Ball';

export class AISystem {
  update(players: Player[], ball: Ball, dt: number): void {
    const humans = players.filter((p) => p.isHumanControlled).map((p) => p.id);

    for (const player of players) {
      if (player.isGoalie || humans.includes(player.id)) {
        continue;
      }

      const teammates = players.filter((p) => p.team === player.team && p.id !== player.id && !p.isGoalie);
      let targetX = ball.position.x;
      let targetY = ball.position.y;

      const distBall = distance(player.position, ball.position);
      const nearest = this.isNearestToBall(player, players, ball);

      if (!nearest || distBall > TUNING.ai.chaseBallDistance) {
        const laneIndex = teammates.findIndex((t) => t.id === player.id);
        const dir = player.team === 'home' ? 1 : -1;
        const laneSign = laneIndex % 2 === 0 ? 1 : -1;
        targetX = ball.position.x - dir * TUNING.ai.supportDistance;
        targetY = ball.position.y + laneSign * TUNING.ai.laneOffsetY;
      }

      const dir = normalize({ x: targetX - player.position.x, y: targetY - player.position.y });
      player.velocity.x += dir.x * TUNING.player.acceleration * dt;
      player.velocity.y += dir.y * TUNING.player.acceleration * dt;
      if (Math.hypot(dir.x, dir.y) > 0) {
        player.facing = dir;
      }
    }
  }

  private isNearestToBall(player: Player, players: Player[], ball: Ball): boolean {
    const teamPlayers = players.filter((p) => p.team === player.team && !p.isGoalie);
    const playerDist = distance(player.position, ball.position);
    return teamPlayers.every((p) => distance(p.position, ball.position) >= playerDist - 1);
  }
}
