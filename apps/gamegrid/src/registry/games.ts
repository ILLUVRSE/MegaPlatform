import type { GameDefinition } from '../types';

const PIXELPUCK_MODULE = () => import('../games/pixelpuck/index');
const THROW_DARTS_MODULE = () => import('../games/throw-darts/index');
const MINIGOLF_MODULE = () => import('../games/minigolf/index');
const FREETHROW_FRENZY_MODULE = () => import('../games/freethrow-frenzy/index');
const HOMERUN_DERBY_MODULE = () => import('../games/homerun-derby/index');
const TABLE_TENNIS_MODULE = () => import('../games/table-tennis/index');
const FOOSBALL_MODULE = () => import('../games/foosball/index');
const POOL_MODULE = () => import('../games/pool/index');
const CARD_TABLE_MODULE = () => import('../games/card-table/index');
const PENALTY_KICK_SHOWDOWN_MODULE = () => import('../games/penalty-kick-showdown/index');
const GOALIE_GAUNTLET_MODULE = () => import('../games/goalie-gauntlet/index');
const ALLEY_BOWLING_BLITZ_MODULE = () => import('../games/alley-bowling-blitz/index');
const OZARK_FISHING_MODULE = () => import('../games/ozark-fishing/index');
const STARLIGHT_CHRONICLES_MODULE = () => import('../games/starlight-chronicles/index');
const OZ_CHRONICLE_MODULE = () => import('../games/oz-chronicle/index');
const WHEEL_OF_FORTUNE_MODULE = () => import('../games/wheel-of-fortune/index');
const CHECKERS_MODULE = () => import('../games/checkers/index');
const BATTLESHIP_MODULE = () => import('../games/battleship/index');
const DRAW_ON_A_POTATO_MODULE = () => import('../games/draw-on-a-potato/index');
const SNAKE_MODULE = () => import('../games/snake/index');

const GAME_ID_ALIASES: Readonly<Record<string, string>> = {
  'texas-holdem': 'card-table'
};

export const REQUIRED_GAME_IDS = [
  'pixelpuck',
  'throw-darts',
  'minigolf',
  'freethrow-frenzy',
  'homerun-derby',
  'table-tennis',
  'foosball',
  'pool',
  'card-table',
  'penalty-kick-showdown',
  'goalie-gauntlet',
  'alley-bowling-blitz',
  'ozark-fishing',
  'starlight-chronicles',
  'oz-chronicle',
  'wheel-of-fortune',
  'checkers',
  'battleship',
  'draw-on-a-potato',
  'snake'
] as const;

export const resolveGameId = (id: string): string => GAME_ID_ALIASES[id] ?? id;

export const GAME_REGISTRY: readonly GameDefinition[] = [
  {
    id: 'pixelpuck',
    title: 'PixelPuck',
    description: 'Arcade air hockey with quick reflex rounds.',
    icon: 'pixelpuck',
    inputType: 'hybrid',
    status: 'live',
    route: '/play/pixelpuck',
    loadModule: PIXELPUCK_MODULE
  },
  {
    id: 'throw-darts',
    title: 'Throw Darts',
    description: 'Classic darts modes: 301, 501, and Cricket.',
    icon: 'throw-darts',
    inputType: 'hybrid',
    status: 'live',
    route: '/play/throw-darts',
    loadModule: THROW_DARTS_MODULE
  },
  {
    id: 'minigolf',
    title: 'Minigolf',
    description: 'Miniature golf challenge across many holes.',
    icon: 'minigolf',
    inputType: 'hybrid',
    status: 'live',
    route: '/play/minigolf',
    loadModule: MINIGOLF_MODULE
  },
  {
    id: 'freethrow-frenzy',
    title: 'Freethrow Frenzy',
    description: 'Basketball shooting streak challenge.',
    icon: 'freethrow-frenzy',
    inputType: 'hybrid',
    status: 'live',
    route: '/play/freethrow-frenzy',
    loadModule: FREETHROW_FRENZY_MODULE
  },
  {
    id: 'homerun-derby',
    title: 'Homerun Derby',
    description: 'Baseball power swings and timing windows.',
    icon: 'homerun-derby',
    inputType: 'hybrid',
    status: 'live',
    route: '/play/homerun-derby',
    loadModule: HOMERUN_DERBY_MODULE
  },
  {
    id: 'table-tennis',
    title: 'Table Tennis',
    description: 'Ping pong rallies with spin control.',
    icon: 'table-tennis',
    inputType: 'hybrid',
    status: 'live',
    route: '/play/table-tennis',
    loadModule: TABLE_TENNIS_MODULE
  },
  {
    id: 'foosball',
    title: 'Foosball',
    description: 'Table soccer with rod control strategy.',
    icon: 'foosball',
    inputType: 'hybrid',
    status: 'live',
    route: '/play/foosball',
    loadModule: FOOSBALL_MODULE
  },
  {
    id: 'pool',
    title: 'Pool',
    description: '8-ball and 9-ball style billiards.',
    icon: 'pool',
    inputType: 'hybrid',
    status: 'live',
    route: '/play/pool',
    loadModule: POOL_MODULE
  },
  {
    id: 'card-table',
    title: 'Card Table',
    description: 'Soft currency poker table sessions.',
    icon: 'card-table',
    inputType: 'mouse',
    status: 'live',
    route: '/play/card-table',
    loadModule: CARD_TABLE_MODULE
  },
  {
    id: 'penalty-kick-showdown',
    title: 'Penalty Kick Showdown',
    description: 'Soccer shootout pressure plays.',
    icon: 'penalty-kick-showdown',
    inputType: 'hybrid',
    status: 'live',
    route: '/play/penalty-kick-showdown',
    loadModule: PENALTY_KICK_SHOWDOWN_MODULE
  },
  {
    id: 'goalie-gauntlet',
    title: 'Goalie Gauntlet',
    description: 'Hockey goalie reflex defense rounds.',
    icon: 'goalie-gauntlet',
    inputType: 'hybrid',
    status: 'live',
    route: '/play/goalie-gauntlet',
    loadModule: GOALIE_GAUNTLET_MODULE
  },
  {
    id: 'alley-bowling-blitz',
    title: 'Alley Bowling Blitz',
    description: 'Casual bowling strikes and spares.',
    icon: 'alley-bowling-blitz',
    inputType: 'hybrid',
    status: 'live',
    route: '/play/alley-bowling-blitz',
    loadModule: ALLEY_BOWLING_BLITZ_MODULE
  },
  {
    id: 'ozark-fishing',
    title: 'Ozark Fishing',
    description: 'Relaxing cast-and-reel lake fishing with tension control.',
    icon: 'pool',
    inputType: 'hybrid',
    status: 'live',
    route: '/play/ozark-fishing',
    loadModule: OZARK_FISHING_MODULE
  },
  {
    id: 'starlight-chronicles',
    title: 'Starlight Chronicles',
    description: 'Story choices, anomaly scans, and arcade starfighter missions.',
    icon: 'pixelpuck',
    inputType: 'hybrid',
    status: 'live',
    route: '/play/starlight-chronicles',
    loadModule: STARLIGHT_CHRONICLES_MODULE
  },
  {
    id: 'oz-chronicle',
    title: 'Chronicles of the Silver Road',
    description: 'Storybook journey inspired by Baum with map nodes and mini-games.',
    icon: 'pool',
    inputType: 'hybrid',
    status: 'live',
    route: '/play/oz-chronicle',
    loadModule: OZ_CHRONICLE_MODULE
  },
  {
    id: 'wheel-of-fortune',
    title: 'Wheel of Fortune',
    description: 'Spin the wheel, solve puzzles, and bank your winnings.',
    icon: 'trophy',
    inputType: 'hybrid',
    status: 'live',
    route: '/play/wheel-of-fortune',
    loadModule: WHEEL_OF_FORTUNE_MODULE
  },
  {
    id: 'checkers',
    title: 'Checkers',
    description: 'Classic board strategy with jumps, kings, and positional play.',
    icon: 'card-table',
    inputType: 'mouse',
    status: 'live',
    route: '/play/checkers',
    loadModule: CHECKERS_MODULE
  },
  {
    id: 'battleship',
    title: 'Battleship',
    description: 'Place your fleet and call shots to sink every enemy ship.',
    icon: 'pool',
    inputType: 'mouse',
    status: 'live',
    route: '/play/battleship',
    loadModule: BATTLESHIP_MODULE
  },
  {
    id: 'snake',
    title: 'Snake',
    description: 'Classic snake loop: eat food, grow longer, avoid walls and yourself.',
    icon: 'pool',
    inputType: 'hybrid',
    status: 'live',
    route: '/play/snake',
    loadModule: SNAKE_MODULE
  },
  {
    id: 'draw-on-a-potato',
    title: 'Draw on a Potato',
    description: 'Free-play potato art sandbox with stickers, sharing, and remix.',
    icon: 'party',
    inputType: 'hybrid',
    status: 'live',
    route: '/play/draw-on-a-potato',
    loadModule: DRAW_ON_A_POTATO_MODULE
  }
] as const;

export const getGameById = (id: string) => GAME_REGISTRY.find((game) => game.id === resolveGameId(id));

