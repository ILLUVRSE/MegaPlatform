export const REAL_TIME_MP_GAMES = [
  'pixelpuck',
  'table-tennis',
  'foosball',
  'goalie-gauntlet',
  'penalty-kick-showdown',
  'ozark-fishing',
  'starlight-chronicles',
  'oz-chronicle'
] as const;

export const TURN_BASED_MP_GAMES = [
  'throw-darts',
  'minigolf',
  'freethrow-frenzy',
  'homerun-derby',
  'pool',
  'alley-bowling-blitz',
  'card-table',
  'wheel-of-fortune',
  'checkers',
  'battleship'
] as const;

export const CARD_TABLE_MULTIPLAYER_MODES = [
  'blackjack',
  'higher-lower',
  '31',
  '5-card-draw',
  'forehead-poker',
  'solitaire',
  'texas-holdem'
] as const;

export const ALL_MP_GAMES = [...REAL_TIME_MP_GAMES, ...TURN_BASED_MP_GAMES] as const;

export const STUB_SAFE_MP_GAMES = ['starlight-chronicles', 'oz-chronicle'] as const;
