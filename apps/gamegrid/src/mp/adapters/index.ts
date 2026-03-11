import type { GameMpAdapterDescriptor } from '../mpAdapter';
import { PixelPuckMultiplayerAdapter } from './pixelpuckAdapter';
import { throw_dartsMpAdapter } from './throw-darts';
import { minigolfMpAdapter } from './minigolf';
import { freethrow_frenzyMpAdapter } from './freethrow-frenzy';
import { homerun_derbyMpAdapter } from './homerun-derby';
import { table_tennisMpAdapter } from './table-tennis';
import { foosballMpAdapter } from './foosball';
import { poolMpAdapter } from './pool';
import { card_tableMpAdapter } from './card-table';
import { penalty_kick_showdownMpAdapter } from './penalty-kick-showdown';
import { goalie_gauntletMpAdapter } from './goalie-gauntlet';
import { alley_bowling_blitzMpAdapter } from './alley-bowling-blitz';
import { ozark_fishingMpAdapter } from './ozark-fishing';
import { starlight_chroniclesMpAdapter } from './starlight-chronicles';
import { oz_chronicleMpAdapter } from './oz-chronicle';
import { wheel_of_fortuneMpAdapter } from './wheel-of-fortune';
import { checkersMpAdapter } from './checkers';
import { battleshipMpAdapter } from './battleship';
import { createStubAdapter } from './stubAdapter';

const PIXELPUCK_ADAPTER = new PixelPuckMultiplayerAdapter();

export const MP_ADAPTER_REGISTRY: Record<string, GameMpAdapterDescriptor> = {
  pixelpuck: {
    gameId: 'pixelpuck',
    adapter: PIXELPUCK_ADAPTER,
    mode: 'real-time',
    messageSchema: ['input', 'snapshot', 'event', 'rematch'],
    implemented: true
  },
  'throw-darts': {
    gameId: 'throw-darts',
    adapter: throw_dartsMpAdapter,
    mode: 'turn-based',
    messageSchema: ['event', 'snapshot'],
    implemented: true
  },
  minigolf: {
    gameId: 'minigolf',
    adapter: minigolfMpAdapter,
    mode: 'turn-based',
    messageSchema: ['event', 'snapshot'],
    implemented: true
  },
  'freethrow-frenzy': {
    gameId: 'freethrow-frenzy',
    adapter: freethrow_frenzyMpAdapter,
    mode: 'turn-based',
    messageSchema: ['event', 'snapshot'],
    implemented: true
  },
  'homerun-derby': {
    gameId: 'homerun-derby',
    adapter: homerun_derbyMpAdapter,
    mode: 'turn-based',
    messageSchema: ['event', 'snapshot'],
    implemented: true
  },
  'table-tennis': {
    gameId: 'table-tennis',
    adapter: table_tennisMpAdapter,
    mode: 'real-time',
    messageSchema: ['input', 'snapshot', 'event', 'rematch'],
    implemented: true
  },
  foosball: {
    gameId: 'foosball',
    adapter: foosballMpAdapter,
    mode: 'real-time',
    messageSchema: ['input', 'snapshot', 'event'],
    implemented: true
  },
  pool: {
    gameId: 'pool',
    adapter: poolMpAdapter,
    mode: 'turn-based',
    messageSchema: ['event', 'snapshot'],
    implemented: true
  },
  'card-table': {
    gameId: 'card-table',
    adapter: card_tableMpAdapter,
    mode: 'turn-based',
    messageSchema: ['event', 'snapshot'],
    implemented: true
  },
  'penalty-kick-showdown': {
    gameId: 'penalty-kick-showdown',
    adapter: penalty_kick_showdownMpAdapter,
    mode: 'real-time',
    messageSchema: ['input', 'snapshot', 'event'],
    implemented: true
  },
  'goalie-gauntlet': {
    gameId: 'goalie-gauntlet',
    adapter: goalie_gauntletMpAdapter,
    mode: 'real-time',
    messageSchema: ['input', 'snapshot', 'event'],
    implemented: true
  },
  'alley-bowling-blitz': {
    gameId: 'alley-bowling-blitz',
    adapter: alley_bowling_blitzMpAdapter,
    mode: 'turn-based',
    messageSchema: ['event', 'snapshot'],
    implemented: true
  },
  'ozark-fishing': {
    gameId: 'ozark-fishing',
    adapter: ozark_fishingMpAdapter,
    mode: 'real-time',
    messageSchema: ['input', 'event', 'snapshot'],
    implemented: true
  },
  'starlight-chronicles': {
    gameId: 'starlight-chronicles',
    adapter: starlight_chroniclesMpAdapter,
    mode: 'real-time',
    messageSchema: [
      'coop_init',
      'coop_phase',
      'vote_cast',
      'vote_resolve',
      'combat_shared_start',
      'dmg_intent',
      'boss_state',
      'boss_phase',
      'ability_cast',
      'ability_apply',
      'combat_shared_end',
      'snapshot_resync',
      'input_rejected',
      'coop_end'
    ],
    implemented: true
  },
  'oz-chronicle': {
    gameId: 'oz-chronicle',
    adapter: oz_chronicleMpAdapter,
    mode: 'real-time',
    messageSchema: ['input', 'event', 'snapshot'],
    implemented: true
  },
  'wheel-of-fortune': {
    gameId: 'wheel-of-fortune',
    adapter: wheel_of_fortuneMpAdapter,
    mode: 'turn-based',
    messageSchema: ['event', 'snapshot'],
    implemented: true
  },
  checkers: {
    gameId: 'checkers',
    adapter: checkersMpAdapter,
    mode: 'turn-based',
    messageSchema: ['event', 'snapshot'],
    implemented: true
  },
  battleship: {
    gameId: 'battleship',
    adapter: battleshipMpAdapter,
    mode: 'turn-based',
    messageSchema: ['event', 'snapshot'],
    implemented: true
  },
  'draw-on-a-potato': {
    gameId: 'draw-on-a-potato',
    adapter: createStubAdapter('draw-on-a-potato', false),
    mode: 'real-time',
    messageSchema: ['input', 'snapshot', 'event'],
    implemented: false
  }
};

export function getMpAdapterDescriptor(gameId: string): GameMpAdapterDescriptor | null {
  return MP_ADAPTER_REGISTRY[gameId] ?? null;
}
