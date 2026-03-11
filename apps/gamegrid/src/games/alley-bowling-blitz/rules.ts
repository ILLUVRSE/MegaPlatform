import { computeScoreCard } from './scoring';
import type { ClassicState, RollOutcome, TimedBlitzState } from './types';

export function createClassicState(): ClassicState {
  return {
    frame: 1,
    rollInFrame: 1,
    pinsStanding: 10,
    rolls: [],
    ended: false
  };
}

function clampPins(pinsKnocked: number, pinsStanding: number): number {
  return Math.max(0, Math.min(pinsStanding, Math.floor(pinsKnocked)));
}

export function applyClassicRoll(state: ClassicState, pinsKnockedRaw: number, isGutter = false): { state: ClassicState; outcome: RollOutcome } {
  if (state.ended) {
    return {
      state,
      outcome: { pinsKnocked: 0, isStrike: false, isSpare: false, isGutter: false }
    };
  }

  const pinsKnocked = isGutter ? 0 : clampPins(pinsKnockedRaw, state.pinsStanding);
  const rolls = state.rolls.slice();
  rolls.push(pinsKnocked);

  let frame = state.frame;
  let rollInFrame: 1 | 2 | 3 = state.rollInFrame;
  let pinsStanding = state.pinsStanding;
  let ended: boolean = state.ended;

  const isTenth = frame === 10;
  let strike = false;
  let spare = false;

  if (!isTenth) {
    if (rollInFrame === 1) {
      if (pinsKnocked === 10) {
        strike = true;
        frame += 1;
        rollInFrame = 1;
        pinsStanding = 10;
      } else {
        rollInFrame = 2;
        pinsStanding = 10 - pinsKnocked;
      }
    } else {
      spare = state.pinsStanding === pinsKnocked && state.pinsStanding > 0;
      frame += 1;
      rollInFrame = 1;
      pinsStanding = 10;
    }
  } else {
    const frameRollStart = rolls.length - (rollInFrame === 1 ? 1 : rollInFrame === 2 ? 2 : 3);
    const first = rolls[frameRollStart] ?? 0;

    if (rollInFrame === 1) {
      strike = pinsKnocked === 10;
      rollInFrame = 2;
      pinsStanding = strike ? 10 : 10 - pinsKnocked;
    } else if (rollInFrame === 2) {
      const second = pinsKnocked;
      if (first === 10) {
        strike = second === 10;
        rollInFrame = 3;
        pinsStanding = second === 10 ? 10 : 10 - second;
      } else if (first + second === 10) {
        spare = true;
        rollInFrame = 3;
        pinsStanding = 10;
      } else {
        ended = true;
      }
    } else {
      ended = true;
    }
  }

  if (frame > 10) {
    ended = true;
    frame = 10;
    rollInFrame = 3;
  }

  const nextState: ClassicState = {
    frame,
    rollInFrame,
    pinsStanding,
    rolls,
    ended
  };

  return {
    state: nextState,
    outcome: {
      pinsKnocked,
      isStrike: strike,
      isSpare: spare,
      isGutter
    }
  };
}

export function classicScore(state: ClassicState): number {
  return computeScoreCard(state.rolls).total;
}

export function createTimedBlitzState(durationMs = 60_000): TimedBlitzState {
  return {
    timeRemainingMs: durationMs,
    score: 0,
    rolls: 0,
    strikeStreak: 0,
    rollInRack: 1,
    firstRollPins: 0,
    ended: false
  };
}

export function tickTimedBlitz(state: TimedBlitzState, elapsedMs: number): TimedBlitzState {
  if (state.ended) return state;
  const nextTime = Math.max(0, state.timeRemainingMs - elapsedMs);
  return {
    ...state,
    timeRemainingMs: nextTime,
    ended: nextTime <= 0
  };
}

export function applyTimedBlitzRoll(state: TimedBlitzState, pinsKnockedRaw: number, isGutter = false): { state: TimedBlitzState; outcome: RollOutcome } {
  if (state.ended) {
    return {
      state,
      outcome: { pinsKnocked: 0, isStrike: false, isSpare: false, isGutter: false }
    };
  }

  const pinsKnocked = isGutter ? 0 : Math.max(0, Math.min(10, Math.floor(pinsKnockedRaw)));
  const strike = state.rollInRack === 1 && pinsKnocked === 10;
  const spare = state.rollInRack === 2 && state.firstRollPins + pinsKnocked === 10;

  let strikeStreak = strike ? state.strikeStreak + 1 : 0;
  let score = state.score + pinsKnocked;

  if (strike) {
    score += 5 + Math.min(6, Math.max(0, strikeStreak - 1) * 2);
  } else if (spare) {
    score += 2;
  }

  let rollInRack: 1 | 2 = state.rollInRack;
  let firstRollPins = state.firstRollPins;

  if (strike || state.rollInRack === 2) {
    rollInRack = 1;
    firstRollPins = 0;
  } else {
    rollInRack = 2;
    firstRollPins = pinsKnocked;
  }

  const nextState: TimedBlitzState = {
    ...state,
    score,
    strikeStreak,
    rolls: state.rolls + 1,
    rollInRack,
    firstRollPins
  };

  return {
    state: nextState,
    outcome: {
      pinsKnocked,
      isStrike: strike,
      isSpare: spare,
      isGutter
    }
  };
}
