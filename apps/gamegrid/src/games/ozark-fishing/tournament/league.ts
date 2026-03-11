import type { LeagueMatch, LeagueStanding, LeagueState, MatchResult, SeededPlayer, TournamentMatchType } from './types';

function ensureBounds(count: number): void {
  if (count < 4 || count > 8) {
    throw new Error('league mode supports 4-8 players');
  }
}

export function createLeagueState(seeded: SeededPlayer[], includeFinal = true): LeagueState {
  ensureBounds(seeded.length);
  const players = seeded.map((s) => s.playerId);
  const rotation = players.slice();
  if (rotation.length % 2 !== 0) rotation.push('__bye__');

  const rounds = rotation.length - 1;
  const matches: LeagueMatch[] = [];

  for (let round = 0; round < rounds; round += 1) {
    for (let i = 0; i < rotation.length / 2; i += 1) {
      const home = rotation[i];
      const away = rotation[rotation.length - 1 - i];
      if (home !== '__bye__' && away !== '__bye__') {
        matches.push({
          id: `l-r${round + 1}-m${i + 1}`,
          round: round + 1,
          home,
          away,
          status: 'pending',
          winnerId: null
        });
      }
    }

    const fixed = rotation[0];
    const tail = rotation.slice(1);
    tail.unshift(tail.pop() as string);
    rotation.splice(0, rotation.length, fixed, ...tail);
  }

  const standings: LeagueStanding[] = players.map((playerId) => ({
    playerId,
    played: 0,
    wins: 0,
    ties: 0,
    losses: 0,
    points: 0,
    totalWeight: 0,
    bestFish: 0
  }));

  return {
    matches,
    standings,
    finalMatch: includeFinal
      ? {
          id: 'league-final',
          round: rounds + 1,
          home: '',
          away: '',
          status: 'pending',
          winnerId: null
        }
      : undefined
  };
}

function standingFor(state: LeagueState, playerId: string): LeagueStanding {
  const standing = state.standings.find((s) => s.playerId === playerId);
  if (!standing) throw new Error(`league standing not found for ${playerId}`);
  return standing;
}

function rankStandings(state: LeagueState, mode: TournamentMatchType): LeagueStanding[] {
  return state.standings
    .slice()
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (mode === 'derby') {
        if (b.totalWeight !== a.totalWeight) return b.totalWeight - a.totalWeight;
        if (b.bestFish !== a.bestFish) return b.bestFish - a.bestFish;
      } else {
        if (b.bestFish !== a.bestFish) return b.bestFish - a.bestFish;
        if (b.totalWeight !== a.totalWeight) return b.totalWeight - a.totalWeight;
      }
      return a.playerId.localeCompare(b.playerId);
    });
}

export function applyLeagueMatchResult(state: LeagueState, matchId: string, result: MatchResult, mode: TournamentMatchType): LeagueState {
  const match = state.matches.find((m) => m.id === matchId) ?? (state.finalMatch?.id === matchId ? state.finalMatch : undefined);
  if (!match) throw new Error(`league match not found: ${matchId}`);
  match.status = 'complete';
  match.winnerId = result.winnerId;
  match.result = result;

  const a = result.standings[0];
  const b = result.standings[1];
  if (!a || !b) return state;

  if (match.id !== 'league-final') {
    const sa = standingFor(state, a.playerId);
    const sb = standingFor(state, b.playerId);

    sa.played += 1;
    sb.played += 1;
    sa.totalWeight += a.totalWeight;
    sb.totalWeight += b.totalWeight;
    sa.bestFish = Math.max(sa.bestFish, a.bestFish);
    sb.bestFish = Math.max(sb.bestFish, b.bestFish);

    if (result.winnerId === a.playerId) {
      sa.wins += 1;
      sb.losses += 1;
      sa.points += 3;
    } else if (result.winnerId === b.playerId) {
      sb.wins += 1;
      sa.losses += 1;
      sb.points += 3;
    } else {
      sa.ties += 1;
      sb.ties += 1;
      sa.points += 1;
      sb.points += 1;
    }
  }

  if (state.finalMatch && state.finalMatch.status === 'pending') {
    const allDone = state.matches.every((m) => m.status === 'complete');
    if (allDone) {
      const ranked = rankStandings(state, mode);
      if (ranked.length >= 2) {
        state.finalMatch.home = ranked[0].playerId;
        state.finalMatch.away = ranked[1].playerId;
      }
    }
  }

  return state;
}

export function nextPlayableLeagueMatch(state: LeagueState): LeagueMatch | null {
  for (let i = 0; i < state.matches.length; i += 1) {
    const m = state.matches[i];
    if (m.status === 'pending') return m;
  }

  if (state.finalMatch && state.finalMatch.home && state.finalMatch.away && state.finalMatch.status === 'pending') {
    return state.finalMatch;
  }
  return null;
}

export function leagueFinalStandings(state: LeagueState, mode: TournamentMatchType): string[] {
  const ranked = rankStandings(state, mode).map((s) => s.playerId);
  const finalMatch = state.finalMatch;
  if (finalMatch?.status === 'complete' && finalMatch.winnerId) {
    const loser = finalMatch.home === finalMatch.winnerId ? finalMatch.away : finalMatch.home;
    const reordered = [finalMatch.winnerId, loser, ...ranked.filter((id) => id !== finalMatch.winnerId && id !== loser)];
    return reordered;
  }
  return ranked;
}
