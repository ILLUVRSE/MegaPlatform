import type { ScoreCard, ScoreFrame } from './types';

export function isStrike(firstRoll: number): boolean {
  return firstRoll === 10;
}

export function isSpare(firstRoll: number, secondRoll: number): boolean {
  return firstRoll < 10 && firstRoll + secondRoll === 10;
}

function safeRoll(rolls: readonly number[], index: number): number {
  return index >= 0 && index < rolls.length ? rolls[index] : 0;
}

export function computeScoreCard(rolls: readonly number[]): ScoreCard {
  const frames: ScoreFrame[] = [];
  let runningTotal = 0;
  let cursor = 0;

  for (let frameIndex = 0; frameIndex < 10; frameIndex += 1) {
    const first = safeRoll(rolls, cursor);
    const frame: ScoreFrame = {
      index: frameIndex + 1,
      rolls: [],
      base: 0,
      bonus: 0,
      total: 0,
      runningTotal,
      isStrike: false,
      isSpare: false
    };

    if (frameIndex < 9) {
      if (isStrike(first)) {
        frame.rolls = [first];
        frame.base = 10;
        frame.bonus = safeRoll(rolls, cursor + 1) + safeRoll(rolls, cursor + 2);
        frame.isStrike = true;
        cursor += 1;
      } else {
        const second = safeRoll(rolls, cursor + 1);
        frame.rolls = [first, second];
        frame.base = first + second;
        if (isSpare(first, second)) {
          frame.bonus = safeRoll(rolls, cursor + 2);
          frame.isSpare = true;
        }
        cursor += 2;
      }
    } else {
      const second = safeRoll(rolls, cursor + 1);
      const third = safeRoll(rolls, cursor + 2);
      frame.rolls = [first, second];
      frame.base = first + second;

      if (isStrike(first) || isSpare(first, second)) {
        frame.rolls.push(third);
        frame.base += third;
      }
      frame.isStrike = isStrike(first);
      frame.isSpare = !frame.isStrike && isSpare(first, second);
      cursor += frame.rolls.length;
    }

    frame.total = frame.base + frame.bonus;
    runningTotal += frame.total;
    frame.runningTotal = runningTotal;
    frames.push(frame);
  }

  return {
    frames,
    total: runningTotal
  };
}

export function bestFrameScore(card: ScoreCard): number {
  let best = 0;
  for (let i = 0; i < card.frames.length; i += 1) {
    if (card.frames[i].total > best) best = card.frames[i].total;
  }
  return best;
}
