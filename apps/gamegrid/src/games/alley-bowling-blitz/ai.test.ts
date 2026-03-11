import { describe, expect, it } from 'vitest';
import { createSeededRng, estimatePinsFromRelease, generateAiRelease } from './ai';
import { createLaneModel } from './physics';

describe('alley bowling AI', () => {
  it('hard difficulty averages more knocked pins than easy', () => {
    const lane = createLaneModel(1280, 720);
    const easyRng = createSeededRng(1001);
    const hardRng = createSeededRng(1001);

    let easyTotal = 0;
    let hardTotal = 0;
    const samples = 250;

    for (let i = 0; i < samples; i += 1) {
      const easyRelease = generateAiRelease(lane, 'easy', easyRng);
      const hardRelease = generateAiRelease(lane, 'hard', hardRng);
      easyTotal += estimatePinsFromRelease(easyRelease, lane);
      hardTotal += estimatePinsFromRelease(hardRelease, lane);
    }

    const easyAvg = easyTotal / samples;
    const hardAvg = hardTotal / samples;

    expect(hardAvg).toBeGreaterThan(easyAvg + 0.9);
  });
});
