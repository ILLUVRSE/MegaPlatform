import { describe, expect, it } from 'vitest';
import cardsManifest from '../../../assets/cards/manifest.json';
import { CARD_TABLE_THEMES } from './themes';

describe('card table asset and theme manifests', () => {
  it('contains the required card pack entries', () => {
    const cards = cardsManifest.cards as Array<{ id: string }>;
    const backs = cardsManifest.backs as Array<{ id: string }>;

    expect(cards.length).toBeGreaterThanOrEqual(52);
    expect(cards.some((card) => card.id === 'AS')).toBe(true);
    expect(cards.some((card) => card.id === 'KH')).toBe(true);
    expect(backs.length).toBeGreaterThanOrEqual(3);
  });

  it('defines at least five complete themes', () => {
    expect(CARD_TABLE_THEMES.length).toBeGreaterThanOrEqual(5);
    for (const theme of CARD_TABLE_THEMES) {
      expect(theme.id.length).toBeGreaterThan(0);
      expect(theme.name.length).toBeGreaterThan(0);
      expect(theme.background.length).toBeGreaterThan(0);
      expect(theme.panel.length).toBeGreaterThan(0);
      expect(theme.accent.length).toBeGreaterThan(0);
      expect(theme.text.length).toBeGreaterThan(0);
      expect(theme.cardBackId.length).toBeGreaterThan(0);
    }
  });
});
