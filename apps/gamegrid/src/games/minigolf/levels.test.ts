import { describe, expect, it } from 'vitest';
import { loadMinigolfCourse } from './levels';

describe('minigolf level loader', () => {
  it('validates required 18 holes with 6-per-theme grouping', () => {
    const course = loadMinigolfCourse();
    expect(course.holes).toHaveLength(18);

    const grouped = course.holes.reduce(
      (acc, hole) => {
        acc[hole.theme] += 1;
        return acc;
      },
      { classic: 0, neon: 0, backyard: 0 }
    );

    expect(grouped.classic).toBe(6);
    expect(grouped.neon).toBe(6);
    expect(grouped.backyard).toBe(6);

    for (let i = 0; i < course.holes.length; i += 1) {
      const hole = course.holes[i];
      expect(hole.par).toBeGreaterThan(1);
      expect(hole.start.x).toBeTypeOf('number');
      expect(hole.cup.radius).toBeGreaterThan(0);
      expect(Array.isArray(hole.walls)).toBe(true);
      expect(Array.isArray(hole.bumpers)).toBe(true);
      expect(Array.isArray(hole.hazards.water)).toBe(true);
      expect(Array.isArray(hole.hazards.surfaces)).toBe(true);
      expect(Array.isArray(hole.hazards.slopes)).toBe(true);
    }

    const slopeFocused = course.holes.filter((hole) => hole.hazards.slopes.length > 0).length;
    const hazardFocused = course.holes.filter((hole) => hole.hazards.water.length > 0).length;
    const obstacleFocused = course.holes.filter((hole) => hole.movingObstacles.length > 0).length;
    const bumperFocused = course.holes.filter((hole) => hole.bumpers.length >= 2).length;

    expect(slopeFocused).toBeGreaterThanOrEqual(4);
    expect(hazardFocused).toBeGreaterThanOrEqual(4);
    expect(obstacleFocused).toBeGreaterThanOrEqual(4);
    expect(bumperFocused).toBeGreaterThanOrEqual(2);
  });
});
