import type { EightGroup, PlayerIndex, RuleState, ShotResolution, ShotResolutionInput } from './types';

function opponentOf(player: PlayerIndex): PlayerIndex {
  return player === 0 ? 1 : 0;
}

function isSolid(number: number): boolean {
  return number >= 1 && number <= 7;
}

function isStripe(number: number): boolean {
  return number >= 9 && number <= 15;
}

function groupForBall(number: number): EightGroup | null {
  if (isSolid(number)) return 'solids';
  if (isStripe(number)) return 'stripes';
  return null;
}

function hasClearedGroup(state: RuleState, player: PlayerIndex): boolean {
  const group = state.eight.groups[player];
  if (group === 'solids') return state.eight.remainingSolids <= 0;
  if (group === 'stripes') return state.eight.remainingStripes <= 0;
  return false;
}

function assignGroup(state: RuleState, picked: EightGroup): RuleState {
  if (picked === 'open') return state;
  const next = { ...state, eight: { ...state.eight, groups: [...state.eight.groups] as [EightGroup, EightGroup] } };
  next.eight.groups[state.currentPlayer] = picked;
  next.eight.groups[opponentOf(state.currentPlayer)] = picked === 'solids' ? 'stripes' : 'solids';
  return next;
}

function recomputeRemaining(state: RuleState, ballsRemaining: number[]): RuleState {
  let solids = 0;
  let stripes = 0;
  for (let i = 0; i < ballsRemaining.length; i += 1) {
    const n = ballsRemaining[i];
    if (isSolid(n)) solids += 1;
    else if (isStripe(n)) stripes += 1;
  }
  return {
    ...state,
    eight: {
      ...state.eight,
      remainingSolids: solids,
      remainingStripes: stripes
    }
  };
}

export function createRuleState(variant: RuleState['variant']): RuleState {
  return {
    variant,
    currentPlayer: 0,
    ballInHand: false,
    winner: null,
    ended: false,
    endReason: null,
    eight: {
      groups: ['open', 'open'],
      remainingSolids: 7,
      remainingStripes: 7
    }
  };
}

function legalTargetsEight(state: RuleState, player: PlayerIndex): number[] {
  const group = state.eight.groups[player];
  if (group === 'open') {
    return [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15];
  }
  if (group === 'solids') {
    return hasClearedGroup(state, player) ? [8] : [1, 2, 3, 4, 5, 6, 7];
  }
  return hasClearedGroup(state, player) ? [8] : [9, 10, 11, 12, 13, 14, 15];
}

function lowestBall(ballsRemaining: number[]): number | null {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < ballsRemaining.length; i += 1) {
    const n = ballsRemaining[i];
    if (n < best) best = n;
  }
  return Number.isFinite(best) ? best : null;
}

function withTurn(state: RuleState, keepTurn: boolean, foul: boolean): RuleState {
  if (state.ended) return state;
  if (keepTurn && !foul) {
    return { ...state, ballInHand: false };
  }
  return {
    ...state,
    currentPlayer: opponentOf(state.currentPlayer),
    ballInHand: foul
  };
}

export function resolveShot(input: ShotResolutionInput): ShotResolution {
  const { strictRules, firstObjectHit, cuePocketed, pocketed, railAfterContact, ballsRemaining } = input;
  let state = recomputeRemaining(input.state, ballsRemaining);

  if (state.ended) {
    return {
      nextState: state,
      foul: false,
      foulReason: null,
      keepTurn: false,
      winner: state.winner,
      endReason: state.endReason,
      assignedGroup: null
    };
  }

  const player = state.currentPlayer;
  const pottedSet = new Set(pocketed);
  let foul = false;
  let foulReason: string | null = null;
  let keepTurn = false;
  let winner: PlayerIndex | null = null;
  let endReason: string | null = null;
  let assignedGroup: EightGroup | null = null;

  if (cuePocketed) {
    foul = true;
    foulReason = 'Scratch';
  }

  if (state.variant === 'eight_ball') {
    const legalTargets = legalTargetsEight(state, player);
    if (firstObjectHit === null || !legalTargets.includes(firstObjectHit)) {
      foul = true;
      foulReason = foulReason ?? 'No legal first contact';
    }

    const pottedNonEight = pocketed.filter((n) => n !== 8 && n !== 0);
    if (state.eight.groups[player] === 'open') {
      for (let i = 0; i < pottedNonEight.length; i += 1) {
        const maybeGroup = groupForBall(pottedNonEight[i]);
        if (maybeGroup) {
          state = assignGroup(state, maybeGroup);
          assignedGroup = maybeGroup;
          break;
        }
      }
    }

    if (strictRules && !foul && pottedSet.size === 0 && !railAfterContact) {
      foul = true;
      foulReason = 'No rail after contact';
    }

    if (pottedSet.has(8)) {
      const cleared = hasClearedGroup(state, player);
      if (!cleared || foul) {
        winner = opponentOf(player);
        endReason = '8-ball pocketed early';
      } else {
        winner = player;
        endReason = '8-ball pocketed legally';
      }
    } else if (!foul) {
      const group = state.eight.groups[player];
      if (group === 'open') {
        keepTurn = pottedNonEight.length > 0;
      } else if (group === 'solids') {
        keepTurn = pocketed.some((n) => isSolid(n));
      } else if (group === 'stripes') {
        keepTurn = pocketed.some((n) => isStripe(n));
      }
    }
  } else {
    const requiredFirst = input.lowestBallBeforeShot;
    if (firstObjectHit === null || firstObjectHit !== requiredFirst) {
      foul = true;
      foulReason = foulReason ?? 'Lowest ball not hit first';
    }

    if (strictRules && !foul && pottedSet.size === 0 && !railAfterContact) {
      foul = true;
      foulReason = 'No rail after contact';
    }

    if (!foul && pottedSet.has(9)) {
      winner = player;
      endReason = '9-ball pocketed legally';
    }

    if (!foul && winner === null) {
      keepTurn = pocketed.some((n) => n !== 0);
    }
  }

  if (winner !== null) {
    state = {
      ...state,
      ended: true,
      winner,
      endReason,
      ballInHand: false
    };
  } else {
    state = withTurn(state, keepTurn, foul);
  }

  return {
    nextState: state,
    foul,
    foulReason,
    keepTurn,
    winner,
    endReason,
    assignedGroup
  };
}

export function legalTargetsForPlayer(state: RuleState, ballsRemaining: number[]): number[] {
  if (state.variant === 'nine_ball') {
    const low = lowestBall(ballsRemaining);
    return low === null ? [] : [low];
  }
  return legalTargetsEight(state, state.currentPlayer);
}
