import type {
  CricketTarget,
  DartHit,
  ThrowDartsCricketPlayerState,
  ThrowDartsCricketState,
  ThrowDartsMatchState,
  ThrowDartsOptions,
  ThrowDartsPracticeMatchState,
  ThrowDartsX01PlayerState,
  ThrowDartsX01State
} from './types';

const CRICKET_TARGETS: readonly CricketTarget[] = [20, 19, 18, 17, 16, 15, 'bull'] as const;

function createPlayerStats() {
  return {
    turns: 0,
    totalScored: 0,
    bulls: 0
  };
}

function createX01Player(startScore: 301 | 501): ThrowDartsX01PlayerState {
  return {
    remaining: startScore,
    turnStartRemaining: startScore,
    lastTurnTotal: 0,
    turnAccumulated: 0,
    lastTurnDarts: [],
    turnDarts: [],
    stats: createPlayerStats()
  };
}

function createCricketPlayer(): ThrowDartsCricketPlayerState {
  return {
    marks: { 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, bull: 0 },
    points: 0,
    lastTurnTotal: 0,
    turnAccumulated: 0,
    lastTurnDarts: [],
    turnDarts: [],
    stats: createPlayerStats()
  };
}

function cloneX01Player(player: ThrowDartsX01PlayerState): ThrowDartsX01PlayerState {
  return {
    remaining: player.remaining,
    turnStartRemaining: player.turnStartRemaining,
    lastTurnTotal: player.lastTurnTotal,
    turnAccumulated: player.turnAccumulated,
    lastTurnDarts: [...player.lastTurnDarts],
    turnDarts: [...player.turnDarts],
    stats: { ...player.stats }
  };
}

function cloneCricketPlayer(player: ThrowDartsCricketPlayerState): ThrowDartsCricketPlayerState {
  return {
    marks: { ...player.marks },
    points: player.points,
    lastTurnTotal: player.lastTurnTotal,
    turnAccumulated: player.turnAccumulated,
    lastTurnDarts: [...player.lastTurnDarts],
    turnDarts: [...player.turnDarts],
    stats: { ...player.stats }
  };
}

function advanceX01Turn(state: ThrowDartsX01State): ThrowDartsX01State {
  const nextPlayer = state.currentPlayer === 0 ? 1 : 0;
  const players: [ThrowDartsX01PlayerState, ThrowDartsX01PlayerState] = [
    cloneX01Player(state.players[0]),
    cloneX01Player(state.players[1])
  ];
  const next = players[nextPlayer];
  next.turnStartRemaining = next.remaining;
  next.turnAccumulated = 0;
  next.turnDarts = [];
  next.stats.turns += 1;

  return {
    ...state,
    currentPlayer: nextPlayer,
    dartsRemaining: 3,
    players
  };
}

function advanceCricketTurn(state: ThrowDartsCricketState): ThrowDartsCricketState {
  const nextPlayer = state.currentPlayer === 0 ? 1 : 0;
  const players: [ThrowDartsCricketPlayerState, ThrowDartsCricketPlayerState] = [
    cloneCricketPlayer(state.players[0]),
    cloneCricketPlayer(state.players[1])
  ];
  const next = players[nextPlayer];
  next.turnAccumulated = 0;
  next.turnDarts = [];
  next.stats.turns += 1;

  return {
    ...state,
    currentPlayer: nextPlayer,
    dartsRemaining: 3,
    players
  };
}

function isClosed(player: ThrowDartsCricketPlayerState, target: CricketTarget): boolean {
  return player.marks[target] >= 3;
}

function toCricketTarget(hit: DartHit): CricketTarget | null {
  if (hit.isBull) return 'bull';
  const value = hit.number;
  if (!value) return null;
  if (value >= 15 && value <= 20) return value as CricketTarget;
  return null;
}

function cricketPointValue(target: CricketTarget): number {
  return target === 'bull' ? 25 : target;
}

function closedAllTargets(player: ThrowDartsCricketPlayerState): boolean {
  for (let i = 0; i < CRICKET_TARGETS.length; i += 1) {
    if (!isClosed(player, CRICKET_TARGETS[i])) return false;
  }
  return true;
}

function applyX01Dart(state: ThrowDartsX01State, hit: DartHit, options: ThrowDartsOptions): ThrowDartsX01State {
  if (state.winner !== null) return state;

  const players: [ThrowDartsX01PlayerState, ThrowDartsX01PlayerState] = [
    cloneX01Player(state.players[0]),
    cloneX01Player(state.players[1])
  ];

  const current = players[state.currentPlayer];
  const nextRemaining = current.remaining - hit.score;
  const dartsRemaining = Math.max(0, state.dartsRemaining - 1);
  current.turnDarts = [...current.turnDarts, hit];

  const bust =
    nextRemaining < 0 ||
    (options.doubleOut && nextRemaining === 1) ||
    (nextRemaining === 0 && options.doubleOut && !hit.isDouble);

  if (hit.isBull) current.stats.bulls += 1;

  if (bust) {
    current.remaining = current.turnStartRemaining;
    current.lastTurnTotal = 0;
    current.turnAccumulated = 0;
    current.lastTurnDarts = [...current.turnDarts];
    current.turnDarts = [];
    return advanceX01Turn({ ...state, dartsRemaining: 0, players });
  }

  current.remaining = nextRemaining;
  current.turnAccumulated += hit.score;
  current.stats.totalScored += hit.score;

  if (nextRemaining === 0) {
    current.lastTurnTotal = current.turnAccumulated;
    current.lastTurnDarts = [...current.turnDarts];
    return {
      ...state,
      dartsRemaining,
      players,
      winner: state.currentPlayer
    };
  }

  if (dartsRemaining === 0) {
    current.lastTurnTotal = current.turnAccumulated;
    current.lastTurnDarts = [...current.turnDarts];
    current.turnAccumulated = 0;
    current.turnDarts = [];
    return advanceX01Turn({ ...state, dartsRemaining: 0, players });
  }

  return {
    ...state,
    dartsRemaining,
    players
  };
}

function applyCricketDart(state: ThrowDartsCricketState, hit: DartHit): ThrowDartsCricketState {
  if (state.winner !== null) return state;

  const players: [ThrowDartsCricketPlayerState, ThrowDartsCricketPlayerState] = [
    cloneCricketPlayer(state.players[0]),
    cloneCricketPlayer(state.players[1])
  ];

  const current = players[state.currentPlayer];
  const opponent = players[state.currentPlayer === 0 ? 1 : 0];
  const dartsRemaining = Math.max(0, state.dartsRemaining - 1);
  current.turnDarts = [...current.turnDarts, hit];

  if (hit.isBull) current.stats.bulls += 1;

  const target = toCricketTarget(hit);
  if (target) {
    const marks = hit.multiplier;
    const existing = current.marks[target];
    const next = Math.min(3, existing + marks);
    const overflow = Math.max(0, existing + marks - 3);

    current.marks[target] = next;

    if (overflow > 0 && !isClosed(opponent, target)) {
      const gained = cricketPointValue(target) * overflow;
      current.points += gained;
      current.turnAccumulated += gained;
      current.stats.totalScored += gained;
    }
  }

  if (closedAllTargets(current) && current.points >= opponent.points) {
    current.lastTurnTotal = current.turnAccumulated;
    current.lastTurnDarts = [...current.turnDarts];
    return {
      ...state,
      dartsRemaining,
      players,
      winner: state.currentPlayer
    };
  }

  if (dartsRemaining === 0) {
    current.lastTurnTotal = current.turnAccumulated;
    current.lastTurnDarts = [...current.turnDarts];
    current.turnAccumulated = 0;
    current.turnDarts = [];
    return advanceCricketTurn({ ...state, dartsRemaining: 0, players });
  }

  return {
    ...state,
    dartsRemaining,
    players
  };
}

function applyPracticeDart(state: ThrowDartsPracticeMatchState, hit: DartHit): ThrowDartsPracticeMatchState {
  const nextTurnDarts = [...state.state.lastTurnDarts, hit].slice(-3);
  const nextState = {
    ...state,
    state: {
      ...state.state,
      throws: state.state.throws + 1,
      lastHit: hit,
      lastTurnDarts: nextTurnDarts,
      stats: {
        ...state.state.stats,
        totalScored: state.state.stats.totalScored + hit.score,
        bulls: state.state.stats.bulls + (hit.isBull ? 1 : 0)
      }
    }
  };

  return {
    ...nextState,
    dartsRemaining: 3
  };
}

export function createInitialThrowDartsState(options: ThrowDartsOptions): ThrowDartsMatchState {
  if (options.mode === 'practice') {
    return {
      kind: 'practice',
      dartsRemaining: 3,
      state: {
        throws: 0,
        lastHit: null,
        lastTurnDarts: [],
        stats: createPlayerStats()
      }
    };
  }

  if (options.mode === 'cricket') {
    const players: [ThrowDartsCricketPlayerState, ThrowDartsCricketPlayerState] = [createCricketPlayer(), createCricketPlayer()];
    players[0].stats.turns = 1;
    return {
      kind: 'cricket',
      currentPlayer: 0,
      dartsRemaining: 3,
      winner: null,
      players
    };
  }

  const startScore = options.mode === '301' ? 301 : 501;
  const players: [ThrowDartsX01PlayerState, ThrowDartsX01PlayerState] = [createX01Player(startScore), createX01Player(startScore)];
  players[0].stats.turns = 1;

  return {
    kind: 'x01',
    startScore,
    currentPlayer: 0,
    dartsRemaining: 3,
    winner: null,
    players
  };
}

export function applyThrowDartsHit(state: ThrowDartsMatchState, hit: DartHit, options: ThrowDartsOptions): ThrowDartsMatchState {
  if (state.kind === 'practice') {
    return applyPracticeDart(state, hit);
  }
  if (state.kind === 'x01') {
    return applyX01Dart(state, hit, options);
  }
  return applyCricketDart(state, hit);
}

export function getAveragePerThree(total: number, turns: number): number {
  if (turns <= 0) return 0;
  return total / turns;
}
