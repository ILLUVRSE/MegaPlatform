import { describe, expect, it } from 'vitest';
import { buildCatchCardMetadata, renderCatchCardPng } from './shareCard';
import { isPngBlobLike } from './photoMode';

describe('ozark share card', () => {
  it('renders 1200x1200 card payload with metadata', async () => {
    const card = await renderCatchCardPng({
      fishId: 'ozark-muskie',
      fishName: 'Ozark Muskie',
      fishArtGlyph: "><(((('>",
      speciesRenderKey: 'fish-muskie-hero',
      weightLb: 24.5,
      rarityTier: 'Legendary',
      spotName: 'Open Water',
      weather: 'light_rain',
      timeOfDay: 'night',
      level: 8,
      dateLabel: '2026-02-15',
      bobberSkinId: 'legend-spark',
      lureSkinId: 'legendary-gild'
    });

    expect(card.width).toBe(1200);
    expect(card.height).toBe(1200);
    expect(card.metadata).toContain('GameGrid');
    expect(card.metadata).toContain('Ozark Fishing');
    expect(card.metadata).toContain('Caught at Open Water');
    expect(card.metadata).toContain('Render:fish-muskie-hero');
    expect(await isPngBlobLike(card.blob)).toBe(true);
  });

  it('metadata includes rarity and level', () => {
    const metadata = buildCatchCardMetadata({
      fishId: 'walleye',
      fishName: 'Walleye',
      fishArtGlyph: '><>',
      speciesRenderKey: 'fish-walleye-hero',
      weightLb: 7.4,
      rarityTier: 'Rare',
      spotName: 'Dock',
      weather: 'overcast',
      timeOfDay: 'night',
      level: 4,
      dateLabel: '2026-02-15',
      bobberSkinId: 'classic-red',
      lureSkinId: 'shad-silver'
    });

    expect(metadata).toContain('Rarity:Rare');
    expect(metadata).toContain('Level:4');
    expect(metadata).toContain('Render:fish-walleye-hero');
  });
});
