import { describe, expect, it } from 'vitest';
import { detectSave, spawnShot } from './physics';

describe('goalie gauntlet physics', () => {
  it('save collision triggers save and deflects puck', () => {
    const shot = spawnShot(
      1,
      {
        lane: 0,
        speed: 520,
        type: 'straight',
        delayMs: 0
      },
      100
    );

    shot.x = 640;
    shot.y = 568;
    shot.vx = 10;
    shot.vy = 520;

    const result = detectSave(
      shot,
      {
        x: 640,
        y: 568,
        width: 148,
        height: 92,
        gloveBias: false
      },
      false,
      240
    );

    expect(result.saved).toBe(true);
    expect(result.deflected).toBe(true);
    expect(shot.vy).toBeLessThan(0);
  });
});
