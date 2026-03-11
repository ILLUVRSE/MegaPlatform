import type { MatchFormat, PlayerIndex, PracticeState, ScoringState } from './types';

function gameIsDeuce(points: [number, number]): boolean {
  return points[0] >= 10 && points[1] >= 10;
}

function serveBlockSize(points: [number, number]): number {
  return gameIsDeuce(points) ? 1 : 2;
}

function computeCurrentServer(firstServer: PlayerIndex, totalPointsInGame: number, points: [number, number]): PlayerIndex {
  const block = serveBlockSize(points);
  return (((Math.floor(totalPointsInGame / block) + firstServer) % 2) as PlayerIndex);
}

function gameWinner(points: [number, number]): PlayerIndex | null {
  if (points[0] >= 11 || points[1] >= 11) {
    if (Math.abs(points[0] - points[1]) >= 2) {
      return points[0] > points[1] ? 0 : 1;
    }
  }
  return null;
}

export function createScoringState(format: MatchFormat, firstServer: PlayerIndex = 0): ScoringState {
  return {
    format,
    targetGames: format === 'best_of_3' ? 2 : 1,
    gamesWon: [0, 0],
    points: [0, 0],
    totalPointsInGame: 0,
    gameIndex: 0,
    firstServer,
    currentServer: firstServer,
    matchWinner: null
  };
}

export function awardPoint(state: ScoringState, winner: PlayerIndex): ScoringState {
  if (state.matchWinner !== null) return state;

  const points: [number, number] = [state.points[0], state.points[1]];
  points[winner] += 1;

  const wonGameBy = gameWinner(points);
  if (wonGameBy !== null) {
    const gamesWon: [number, number] = [state.gamesWon[0], state.gamesWon[1]];
    gamesWon[wonGameBy] += 1;

    const matchWinner = gamesWon[wonGameBy] >= state.targetGames ? wonGameBy : null;
    if (matchWinner !== null) {
      return {
        ...state,
        points,
        totalPointsInGame: state.totalPointsInGame + 1,
        gamesWon,
        currentServer: computeCurrentServer(state.firstServer, state.totalPointsInGame + 1, points),
        matchWinner
      };
    }

    const nextFirstServer = (1 - state.firstServer) as PlayerIndex;
    return {
      ...state,
      points: [0, 0],
      totalPointsInGame: 0,
      gamesWon,
      gameIndex: state.gameIndex + 1,
      firstServer: nextFirstServer,
      currentServer: nextFirstServer
    };
  }

  const totalPoints = state.totalPointsInGame + 1;
  return {
    ...state,
    points,
    totalPointsInGame: totalPoints,
    currentServer: computeCurrentServer(state.firstServer, totalPoints, points)
  };
}

export function createPracticeState(totalBalls = 20): PracticeState {
  return {
    totalBalls,
    ballsTaken: 0,
    score: 0,
    targetHits: 0,
    lastAward: 0,
    ended: false
  };
}

export function registerPracticeShot(state: PracticeState, awardPoints: number): PracticeState {
  if (state.ended) return state;

  const nextTaken = state.ballsTaken + 1;
  const nextScore = state.score + Math.max(0, awardPoints);
  const nextHits = state.targetHits + (awardPoints > 0 ? 1 : 0);
  const ended = nextTaken >= state.totalBalls;

  return {
    ...state,
    ballsTaken: nextTaken,
    score: nextScore,
    targetHits: nextHits,
    lastAward: Math.max(0, awardPoints),
    ended
  };
}
