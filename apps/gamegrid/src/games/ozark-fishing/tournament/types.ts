export type TournamentFormat = 'bracket' | 'league';
export type TournamentMatchType = 'derby' | 'big_catch';

export type TournamentPhase =
  | 'lobby'
  | 'round'
  | 'match'
  | 'results'
  | 'next'
  | 'complete'
  | 'paused';

export interface TournamentConfig {
  enabled: boolean;
  format: TournamentFormat;
  matchType: TournamentMatchType;
  durationSec: number;
  name: string;
}

export interface SeededPlayer {
  playerId: string;
  seed: number;
  hash: number;
}

export interface MatchPlayerScore {
  playerId: string;
  totalWeight: number;
  bestFish: number;
  lastCatchTimeMs: number;
  firstCatchTimeMs: number;
}

export interface MatchTieBreakData {
  primary: number;
  secondary: number;
  tertiary: number;
  rule: string;
}

export interface MatchResult {
  winnerId: string | null;
  loserId: string | null;
  tieBreakData: MatchTieBreakData;
  standings: MatchPlayerScore[];
}

export interface BracketMatch {
  id: string;
  round: number;
  slot: number;
  playerA: string | null;
  playerB: string | null;
  winnerId: string | null;
  loserId: string | null;
  status: 'pending' | 'live' | 'complete';
  sourceA?: string;
  sourceB?: string;
  result?: MatchResult;
}

export interface BracketState {
  size: number;
  rounds: number;
  matches: BracketMatch[];
}

export interface LeagueMatch {
  id: string;
  round: number;
  home: string;
  away: string;
  status: 'pending' | 'live' | 'complete';
  winnerId: string | null;
  result?: MatchResult;
}

export interface LeagueStanding {
  playerId: string;
  played: number;
  wins: number;
  ties: number;
  losses: number;
  points: number;
  totalWeight: number;
  bestFish: number;
}

export interface LeagueState {
  matches: LeagueMatch[];
  standings: LeagueStanding[];
  finalMatch?: LeagueMatch;
}

export interface TournamentMatchAssignment {
  matchId: string;
  players: string[];
  spectators: string[];
}

export interface TournamentState {
  id: string;
  roomSeed: number;
  config: TournamentConfig;
  roster: string[];
  seeded: SeededPlayer[];
  phase: TournamentPhase;
  startedAtIso: string;
  activeMatchId: string | null;
  bracket?: BracketState;
  league?: LeagueState;
  finalStandings: string[];
}

export type TournamentEvent =
  | {
      type: 'tournament_create';
      config: TournamentConfig;
      roster: string[];
      seedOrder: string[];
    }
  | {
      type: 'tournament_start';
      bracketState?: BracketState;
      leagueState?: LeagueState;
    }
  | {
      type: 'match_assign';
      matchId: string;
      players: string[];
      spectators: string[];
    }
  | {
      type: 'match_result';
      matchId: string;
      standings: MatchPlayerScore[];
      tieBreakData: MatchTieBreakData;
    }
  | {
      type: 'tournament_advance';
      updatedState: Pick<TournamentState, 'phase' | 'activeMatchId' | 'finalStandings'>;
    }
  | {
      type: 'tournament_end';
      finalStandings: string[];
    };

export interface TournamentHistoryEntry {
  id: string;
  dateIso: string;
  format: TournamentFormat;
  matchType: TournamentMatchType;
  durationSec: number;
  standings: string[];
  topFishWeight: number;
  posterMetadata: string;
}
