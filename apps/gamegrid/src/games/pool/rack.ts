import type { PoolBall, PoolVariant, TableGeometry } from './types';

function baseBall(number: number, x: number, y: number): PoolBall {
  let kind: PoolBall['kind'] = 'solid';
  if (number === 0) kind = 'cue';
  else if (number === 8) kind = 'eight';
  else if (number === 9) kind = 'nine';
  else if (number >= 9) kind = 'stripe';

  return {
    id: number,
    number,
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    spinX: 0,
    spinY: 0,
    pocketed: false
  };
}

function trianglePositions(apexX: number, apexY: number, radius: number, rows: number): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  const xSpacing = radius * 2 * 0.97;
  const ySpacing = radius * 2.04;

  for (let row = 0; row < rows; row += 1) {
    const x = apexX + row * xSpacing;
    const startY = apexY - (row * ySpacing) * 0.5;
    for (let col = 0; col <= row; col += 1) {
      out.push({ x, y: startY + col * ySpacing });
    }
  }

  return out;
}

export function createRack(variant: PoolVariant, table: TableGeometry): PoolBall[] {
  const cueX = table.bounds.left + (table.bounds.right - table.bounds.left) * 0.24;
  const cueY = (table.bounds.top + table.bounds.bottom) * 0.5;
  const apexX = table.bounds.left + (table.bounds.right - table.bounds.left) * 0.72;
  const apexY = cueY;

  const balls: PoolBall[] = [baseBall(0, cueX, cueY)];

  if (variant === 'nine_ball') {
    const positions = trianglePositions(apexX, apexY, table.ballRadius, 5).slice(0, 9);
    const order = [1, 2, 3, 4, 9, 5, 6, 7, 8];
    for (let i = 0; i < order.length; i += 1) {
      const p = positions[i];
      balls.push(baseBall(order[i], p.x, p.y));
    }
    return balls;
  }

  const positions = trianglePositions(apexX, apexY, table.ballRadius, 5);
  const order = [1, 10, 2, 11, 8, 3, 12, 4, 13, 5, 14, 6, 15, 7, 9];
  for (let i = 0; i < order.length; i += 1) {
    const p = positions[i];
    balls.push(baseBall(order[i], p.x, p.y));
  }

  return balls;
}

export function resetVelocities(balls: PoolBall[]): void {
  for (let i = 0; i < balls.length; i += 1) {
    const b = balls[i];
    b.vx = 0;
    b.vy = 0;
    b.spinX = 0;
    b.spinY = 0;
  }
}
