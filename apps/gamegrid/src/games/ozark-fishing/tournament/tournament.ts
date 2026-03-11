import {
  applyBracketMatchResult,
  bracketFinalStandings,
  createBracketState,
  deterministicSeedOrder,
  nextPlayableBracketMatch,
  stableHash
} from './bracket';
import { applyLeagueMatchResult, createLeagueState, leagueFinalStandings, nextPlayableLeagueMatch } from './league';
import type {
  MatchPlayerScore,
  MatchResult,
  MatchTieBreakData,
  TournamentConfig,
  TournamentMatchAssignment,
  TournamentState
} from './types';

function normalizeConfig(config: Partial<TournamentConfig>): TournamentConfig {
  const format = config.format === 'league' ? 'league' : 'bracket';
  const matchType = config.matchType === 'big_catch' ? 'big_catch' : 'derby';
  const durationSec = config.durationSec === 120 || config.durationSec === 300 ? config.durationSec : 180;
  return {
    enabled: config.enabled === true,
    format,
    matchType,
    durationSec,
    name: (config.name && String(config.name).trim()) || 'Ozark Night Tournament'
  };
}

export function createTournamentState(roomSeed: number, roster: string[], config: Partial<TournamentConfig>, startedAt = new Date()): TournamentState {
  const cleanRoster = Array.from(new Set(roster.map((id) => String(id).trim()).filter(Boolean)));
  if (cleanRoster.length < 4) {
    throw new Error('tournament requires at least 4 players');
  }

  const normalized = normalizeConfig(config);
  if (normalized.format === 'league' && cleanRoster.length > 8) {
    throw new Error('league mode supports up to 8 players');
  }
  if (cleanRoster.length > 16) {
    throw new Error('tournament supports up to 16 players');
  }

  const seeded = deterministicSeedOrder(cleanRoster, roomSeed);
  const id = `ozark-tour-${stableHash(`${roomSeed}:${cleanRoster.join('|')}:${normalized.format}`)}`;

  return {
    id,
    roomSeed,
    config: normalized,
    roster: cleanRoster,
    seeded,
    phase: 'lobby',
    startedAtIso: startedAt.toISOString(),
    activeMatchId: null,
    finalStandings: []
  };
}

export function startTournament(state: TournamentState): TournamentState {
  state.phase = 'round';
  if (state.config.format === 'bracket') {
    state.bracket = createBracketState(state.seeded);
  } else {
    state.league = createLeagueState(state.seeded, true);
  }
  return advanceTournament(state);
}

export function resolveMatchResult(matchType: TournamentState['config']['matchType'], scores: MatchPlayerScore[]): MatchResult {
  if (scores.length !== 2) {
    throw new Error('tournament match requires exactly 2 player scores');
  }
  const ranked = scores.slice().sort((a, b) => {
    if (matchType === 'derby') {
      if (b.totalWeight !== a.totalWeight) return b.totalWeight - a.totalWeight;
      if (b.bestFish !== a.bestFish) return b.bestFish - a.bestFish;
      if (a.lastCatchTimeMs !== b.lastCatchTimeMs) return a.lastCatchTimeMs - b.lastCatchTimeMs;
      return a.playerId.localeCompare(b.playerId);
    }

    if (b.bestFish !== a.bestFish) return b.bestFish - a.bestFish;
    if (b.totalWeight !== a.totalWeight) return b.totalWeight - a.totalWeight;
    if (a.firstCatchTimeMs !== b.firstCatchTimeMs) return a.firstCatchTimeMs - b.firstCatchTimeMs;
    return a.playerId.localeCompare(b.playerId);
  });

  const winner = ranked[0];
  const loser = ranked[1];

  let rule = '';
  let secondary = 0;
  let tertiary = 0;
  if (matchType === 'derby') {
    rule = 'derby_total_weight_then_biggest_then_earliest_last_catch';
    secondary = winner.bestFish;
    tertiary = winner.lastCatchTimeMs;
  } else {
    rule = 'big_catch_biggest_then_total_then_earliest_catch';
    secondary = winner.totalWeight;
    tertiary = winner.firstCatchTimeMs;
  }

  const tieBreakData: MatchTieBreakData = {
    primary: matchType === 'derby' ? winner.totalWeight : winner.bestFish,
    secondary,
    tertiary,
    rule
  };

  return {
    winnerId: winner.playerId,
    loserId: loser.playerId,
    tieBreakData,
    standings: ranked
  };
}

export function currentMatchAssignment(state: TournamentState): TournamentMatchAssignment | null {
  if (!state.activeMatchId) return null;

  if (state.config.format === 'bracket' && state.bracket) {
    const match = state.bracket.matches.find((m) => m.id === state.activeMatchId);
    if (!match || !match.playerA || !match.playerB) return null;
    return {
      matchId: match.id,
      players: [match.playerA, match.playerB],
      spectators: state.roster.filter((id) => id !== match.playerA && id !== match.playerB)
    };
  }

  if (state.config.format === 'league' && state.league) {
    const match = state.league.matches.find((m) => m.id === state.activeMatchId) ?? (state.league.finalMatch?.id === state.activeMatchId ? state.league.finalMatch : null);
    if (!match || !match.home || !match.away) return null;
    return {
      matchId: match.id,
      players: [match.home, match.away],
      spectators: state.roster.filter((id) => id !== match.home && id !== match.away)
    };
  }

  return null;
}

export function completeCurrentMatch(state: TournamentState, scores: MatchPlayerScore[]): { state: TournamentState; result: MatchResult } {
  if (!state.activeMatchId) throw new Error('no active tournament match');

  const result = resolveMatchResult(state.config.matchType, scores);
  state.phase = 'results';

  if (state.config.format === 'bracket' && state.bracket) {
    applyBracketMatchResult(state.bracket, state.activeMatchId, result);
  } else if (state.config.format === 'league' && state.league) {
    applyLeagueMatchResult(state.league, state.activeMatchId, result, state.config.matchType);
  }

  advanceTournament(state);
  return { state, result };
}

export function advanceTournament(state: TournamentState): TournamentState {
  state.phase = 'next';

  if (state.config.format === 'bracket' && state.bracket) {
    const nextMatch = nextPlayableBracketMatch(state.bracket);
    if (nextMatch) {
      state.activeMatchId = nextMatch.id;
      state.phase = 'match';
      return state;
    }

    state.finalStandings = bracketFinalStandings(state.bracket, state.config.matchType);
    state.activeMatchId = null;
    state.phase = 'complete';
    return state;
  }

  if (state.config.format === 'league' && state.league) {
    const nextMatch = nextPlayableLeagueMatch(state.league);
    if (nextMatch) {
      state.activeMatchId = nextMatch.id;
      state.phase = 'match';
      return state;
    }

    state.finalStandings = leagueFinalStandings(state.league, state.config.matchType);
    state.activeMatchId = null;
    state.phase = 'complete';
    return state;
  }

  state.phase = 'complete';
  state.activeMatchId = null;
  return state;
}

export function estimateTournamentRounds(format: TournamentConfig['format'], players: number): number {
  if (format === 'league') {
    if (players < 4) return 0;
    return players - 1 + 1;
  }
  let n = 1;
  let rounds = 0;
  while (n < Math.max(2, players)) {
    n <<= 1;
    rounds += 1;
  }
  return rounds;
}

export function estimateTournamentDurationMin(format: TournamentConfig['format'], players: number, matchDurationSec: number): number {
  const rounds = estimateTournamentRounds(format, players);
  if (format === 'league') {
    const matches = (players * (players - 1)) / 2 + 1;
    return Math.ceil((matches * matchDurationSec) / 60);
  }

  const bracketMatches = Math.max(1, Math.pow(2, rounds) - 1);
  return Math.ceil((bracketMatches * matchDurationSec) / 60);
}
