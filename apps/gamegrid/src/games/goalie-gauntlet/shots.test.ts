import { describe, expect, it } from 'vitest';
import { computeVarietyScore, getDifficultyProfile } from './shots';

describe('goalie gauntlet shot generation', () => {
  it('difficulty scaling increases speed and variety', () => {
    const easyWave1 = getDifficultyProfile('easy', 1, false);
    const hardWave8 = getDifficultyProfile('hard', 8, false);

    expect(hardWave8.speedMax).toBeGreaterThan(easyWave1.speedMax);
    expect(computeVarietyScore(hardWave8)).toBeGreaterThan(computeVarietyScore(easyWave1));
  });
});
