import { describe, expect, it } from 'vitest';
import { GAME_REGISTRY, REQUIRED_GAME_IDS, getGameById } from './games';

describe('game registry', () => {
  it('contains exactly 20 games', () => {
    expect(GAME_REGISTRY).toHaveLength(20);
  });

  it('has unique ids and includes required ids', () => {
    const ids = GAME_REGISTRY.map((game) => game.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.slice().sort()).toEqual([...REQUIRED_GAME_IDS].slice().sort());
  });

  it('marks freethrow-frenzy as live', () => {
    const game = GAME_REGISTRY.find((entry) => entry.id === 'freethrow-frenzy');
    expect(game?.status).toBe('live');
  });

  it('marks homerun-derby as live', () => {
    const game = GAME_REGISTRY.find((entry) => entry.id === 'homerun-derby');
    expect(game?.status).toBe('live');
  });

  it('marks table-tennis as live', () => {
    const game = GAME_REGISTRY.find((entry) => entry.id === 'table-tennis');
    expect(game?.status).toBe('live');
  });

  it('marks foosball as live', () => {
    const game = GAME_REGISTRY.find((entry) => entry.id === 'foosball');
    expect(game?.status).toBe('live');
  });

  it('marks pool as live', () => {
    const game = GAME_REGISTRY.find((entry) => entry.id === 'pool');
    expect(game?.status).toBe('live');
  });

  it('marks card-table as live', () => {
    const game = GAME_REGISTRY.find((entry) => entry.id === 'card-table');
    expect(game?.status).toBe('live');
  });

  it('marks penalty-kick-showdown as live', () => {
    const game = GAME_REGISTRY.find((entry) => entry.id === 'penalty-kick-showdown');
    expect(game?.status).toBe('live');
  });

  it('marks goalie-gauntlet as live', () => {
    const game = GAME_REGISTRY.find((entry) => entry.id === 'goalie-gauntlet');
    expect(game?.status).toBe('live');
  });

  it('marks alley-bowling-blitz as live', () => {
    const game = GAME_REGISTRY.find((entry) => entry.id === 'alley-bowling-blitz');
    expect(game?.status).toBe('live');
  });

  it('marks ozark-fishing as live', () => {
    const game = GAME_REGISTRY.find((entry) => entry.id === 'ozark-fishing');
    expect(game?.status).toBe('live');
  });

  it('marks starlight-chronicles as live', () => {
    const game = GAME_REGISTRY.find((entry) => entry.id === 'starlight-chronicles');
    expect(game?.status).toBe('live');
  });

  it('marks oz-chronicle as live', () => {
    const game = GAME_REGISTRY.find((entry) => entry.id === 'oz-chronicle');
    expect(game?.status).toBe('live');
  });

  it('marks wheel-of-fortune as live', () => {
    const game = GAME_REGISTRY.find((entry) => entry.id === 'wheel-of-fortune');
    expect(game?.status).toBe('live');
  });

  it('marks checkers as live', () => {
    const game = GAME_REGISTRY.find((entry) => entry.id === 'checkers');
    expect(game?.status).toBe('live');
  });

  it('marks battleship as live', () => {
    const game = GAME_REGISTRY.find((entry) => entry.id === 'battleship');
    expect(game?.status).toBe('live');
  });

  it('marks snake as live', () => {
    const game = GAME_REGISTRY.find((entry) => entry.id === 'snake');
    expect(game?.status).toBe('live');
  });

  it('marks draw-on-a-potato as live', () => {
    const game = GAME_REGISTRY.find((entry) => entry.id === 'draw-on-a-potato');
    expect(game?.status).toBe('live');
  });

  it('resolves legacy texas-holdem id to card-table', () => {
    const game = getGameById('texas-holdem');
    expect(game?.id).toBe('card-table');
  });
});

