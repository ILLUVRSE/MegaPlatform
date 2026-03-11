import { describe, expect, it } from 'vitest';
import { polarToBoardPoint, scoreDartboardHit } from './scoring';

const board = {
  centerX: 640,
  centerY: 330,
  radius: 250
};

describe('throw darts geometry scoring', () => {
  it('scores known polar coordinates accurately', () => {
    const triple20Point = polarToBoardPoint(103 / 170, 0, board);
    const triple20 = scoreDartboardHit(triple20Point.x, triple20Point.y, board);
    expect(triple20.ring).toBe('triple');
    expect(triple20.number).toBe(20);
    expect(triple20.score).toBe(60);

    const segment = (Math.PI * 2) / 20;
    const theta16 = (13 + 0.5) * segment;
    const double16Point = polarToBoardPoint(166 / 170, theta16, board);
    const double16 = scoreDartboardHit(double16Point.x, double16Point.y, board);
    expect(double16.ring).toBe('double');
    expect(double16.number).toBe(16);
    expect(double16.score).toBe(32);

    const innerBullPoint = polarToBoardPoint(4 / 170, 0, board);
    const innerBull = scoreDartboardHit(innerBullPoint.x, innerBullPoint.y, board);
    expect(innerBull.ring).toBe('inner_bull');
    expect(innerBull.score).toBe(50);
  });

  it('resolves boundary angles consistently', () => {
    const segment = (Math.PI * 2) / 20;
    const nearTopLeft = polarToBoardPoint(120 / 170, segment - 0.00001, board);
    const hitLeft = scoreDartboardHit(nearTopLeft.x, nearTopLeft.y, board);
    expect(hitLeft.number).toBe(20);

    const nearTopRight = polarToBoardPoint(120 / 170, segment + 0.00001, board);
    const hitRight = scoreDartboardHit(nearTopRight.x, nearTopRight.y, board);
    expect(hitRight.number).toBe(1);
  });

  it('detects ring thresholds for double and triple', () => {
    const triplePoint = polarToBoardPoint(103 / 170, 0, board);
    const tripleHit = scoreDartboardHit(triplePoint.x, triplePoint.y, board);
    expect(tripleHit.ring).toBe('triple');

    const singlePoint = polarToBoardPoint(120 / 170, 0, board);
    const singleHit = scoreDartboardHit(singlePoint.x, singlePoint.y, board);
    expect(singleHit.ring).toBe('single');

    const doublePoint = polarToBoardPoint(166 / 170, 0, board);
    const doubleHit = scoreDartboardHit(doublePoint.x, doublePoint.y, board);
    expect(doubleHit.ring).toBe('double');
  });
});
