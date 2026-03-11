import {
  HORSE_WORD,
  MAX_STREAK_MULTIPLIER,
  THREE_POINT_RACK_ORDER,
  THREE_POINT_RACK_SIZE,
  TIMED_MODE_DURATION_MS,
  type FreethrowMode,
  type FreethrowModeState,
  type HorseModeState,
  type ShotAttemptSummary,
  type ShotSpotId,
  type ThreePointContestState,
  type TimedModeState
} from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getMultiplierForStreak(streak: number): number {
  if (streak >= 4) return MAX_STREAK_MULTIPLIER;
  if (streak >= 2) return 2;
  return 1;
}

export function createInitialModeState(mode: FreethrowMode): FreethrowModeState {
  if (mode === 'timed_60') {
    return {
      kind: 'timed_60',
      timeRemainingMs: TIMED_MODE_DURATION_MS,
      score: 0,
      attempts: 0,
      makes: 0,
      streak: 0,
      bestStreak: 0,
      multiplier: 1,
      ended: false
    };
  }

  if (mode === 'three_point_contest') {
    return {
      kind: 'three_point_contest',
      score: 0,
      attempts: 0,
      makes: 0,
      currentSpotIndex: 0,
      ballInRack: 0,
      totalBallsShot: 0,
      ended: false
    };
  }

  return {
    kind: 'horse',
    shooter: 0,
    responder: 1,
    phase: 'set_challenge',
    challengeSpot: null,
    playerLetters: [0, 0],
    attempts: [0, 0],
    makes: [0, 0],
    winner: null,
    ended: false
  };
}

export function tickTimedMode(state: TimedModeState, deltaMs: number): TimedModeState {
  if (state.ended) return state;
  const nextTime = clamp(state.timeRemainingMs - deltaMs, 0, TIMED_MODE_DURATION_MS);
  return {
    ...state,
    timeRemainingMs: nextTime,
    ended: nextTime <= 0
  };
}

export function applyTimedShot(state: TimedModeState, shot: ShotAttemptSummary): TimedModeState {
  if (state.ended) return state;

  const attempts = state.attempts + 1;
  const makes = state.makes + (shot.made ? 1 : 0);
  const streak = shot.made ? state.streak + 1 : 0;
  const multiplier = getMultiplierForStreak(streak);
  const scoreGain = shot.made ? shot.points * multiplier : 0;

  return {
    ...state,
    attempts,
    makes,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    multiplier,
    score: state.score + scoreGain
  };
}

export function getThreePointSpot(state: ThreePointContestState): ShotSpotId {
  return THREE_POINT_RACK_ORDER[Math.min(state.currentSpotIndex, THREE_POINT_RACK_ORDER.length - 1)];
}

export function getThreePointBallValue(state: ThreePointContestState): number {
  return state.ballInRack === THREE_POINT_RACK_SIZE - 1 ? 2 : 1;
}

export function applyThreePointShot(state: ThreePointContestState, made: boolean): ThreePointContestState {
  if (state.ended) return state;

  const attempts = state.attempts + 1;
  const makes = state.makes + (made ? 1 : 0);
  const totalBallsShot = state.totalBallsShot + 1;
  const currentValue = getThreePointBallValue(state);
  const score = state.score + (made ? currentValue : 0);

  let ballInRack = state.ballInRack + 1;
  let currentSpotIndex = state.currentSpotIndex;

  if (ballInRack >= THREE_POINT_RACK_SIZE) {
    ballInRack = 0;
    currentSpotIndex += 1;
  }

  const ended = totalBallsShot >= THREE_POINT_RACK_ORDER.length * THREE_POINT_RACK_SIZE;

  return {
    ...state,
    score,
    attempts,
    makes,
    totalBallsShot,
    ballInRack,
    currentSpotIndex,
    ended
  };
}

function applyHorseLetters(state: HorseModeState, player: 0 | 1): HorseModeState {
  const letters: [number, number] = [state.playerLetters[0], state.playerLetters[1]];
  letters[player] = Math.min(HORSE_WORD.length, letters[player] + 1);

  const loser = letters[player] >= HORSE_WORD.length ? player : null;
  const winner = loser === null ? null : ((loser === 0 ? 1 : 0) as 0 | 1);

  return {
    ...state,
    playerLetters: letters,
    winner,
    ended: winner !== null,
    phase: winner === null ? state.phase : 'ended'
  };
}

export function horseLettersForPlayer(state: HorseModeState, player: 0 | 1): string {
  return HORSE_WORD.slice(0, state.playerLetters[player]);
}

export function applyHorseSetChallengeShot(
  state: HorseModeState,
  shooterSpot: ShotSpotId,
  made: boolean
): HorseModeState {
  if (state.ended || state.phase !== 'set_challenge') return state;

  const attempts: [number, number] = [state.attempts[0], state.attempts[1]];
  const makes: [number, number] = [state.makes[0], state.makes[1]];
  attempts[state.shooter] += 1;
  if (made) makes[state.shooter] += 1;

  if (!made) {
    const nextShooter = (state.shooter === 0 ? 1 : 0) as 0 | 1;
    return {
      ...state,
      attempts,
      makes,
      shooter: nextShooter,
      responder: state.shooter,
      challengeSpot: null,
      phase: 'set_challenge'
    };
  }

  return {
    ...state,
    attempts,
    makes,
    challengeSpot: shooterSpot,
    responder: state.shooter === 0 ? 1 : 0,
    phase: 'answer'
  };
}

export function applyHorseAnswerShot(state: HorseModeState, made: boolean): HorseModeState {
  if (state.ended || state.phase !== 'answer') return state;

  const responder = state.responder;
  const shooter = state.shooter;
  const attempts: [number, number] = [state.attempts[0], state.attempts[1]];
  const makes: [number, number] = [state.makes[0], state.makes[1]];
  attempts[responder] += 1;
  if (made) makes[responder] += 1;

  let nextState: HorseModeState = {
    ...state,
    attempts,
    makes,
    phase: 'set_challenge',
    challengeSpot: null,
    shooter: made ? responder : shooter,
    responder: made ? shooter : responder
  };

  if (!made) {
    nextState = applyHorseLetters(nextState, responder);
    if (nextState.ended) return nextState;
  }

  return nextState;
}

export function computeAccuracy(attempts: number, makes: number): number {
  if (attempts <= 0) return 0;
  return makes / attempts;
}

