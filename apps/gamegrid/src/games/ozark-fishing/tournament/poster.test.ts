import { describe, expect, it } from 'vitest';
import { isPngBlobLike } from '../photoMode';
import { buildTournamentPosterMetadata, renderTournamentPosterPng } from './poster';

describe('ozark tournament poster', () => {
  it('renders 1200x1600 PNG-like poster payload', async () => {
    const poster = await renderTournamentPosterPng({
      tournamentName: 'Ozark Night Tournament',
      dateLabel: '2026-02-15',
      format: 'bracket',
      matchType: 'derby',
      durationSec: 180,
      roomCodeText: 'ABCD12',
      standings: [
        { playerId: 'host', bestFishWeight: 12.4, rarityBadge: 'Rare' },
        { playerId: 'p2', bestFishWeight: 11.1, rarityBadge: 'Uncommon' },
        { playerId: 'p3', bestFishWeight: 9.8, rarityBadge: 'Common' }
      ]
    });

    expect(poster.width).toBe(1200);
    expect(poster.height).toBe(1600);
    expect(await isPngBlobLike(poster.blob)).toBe(true);
    expect(poster.metadata).toContain('GameGrid');
    expect(poster.metadata).toContain('Ozark Fishing');
  });

  it('includes key tournament metadata fields', () => {
    const metadata = buildTournamentPosterMetadata({
      tournamentName: 'Ozark Night Tournament',
      dateLabel: '2026-02-15',
      format: 'league',
      matchType: 'big_catch',
      durationSec: 120,
      roomCodeText: 'WXYZ99',
      standings: [{ playerId: 'champ', bestFishWeight: 15.2, rarityBadge: 'Legendary' }]
    });

    expect(metadata).toContain('Tournament:Ozark Night Tournament');
    expect(metadata).toContain('Format:league');
    expect(metadata).toContain('Match:big_catch');
    expect(metadata).toContain('Room:WXYZ99');
  });
});
