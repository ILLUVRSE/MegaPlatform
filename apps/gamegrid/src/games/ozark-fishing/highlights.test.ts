import { describe, expect, it } from 'vitest';
import { detectSessionHighlights } from './highlights';

describe('ozark highlights', () => {
  it('detects biggest, rarest, and dramatic fight highlights', () => {
    const catches = [
      { fishId: 'bluegill', fishName: 'Bluegill', weightLb: 1.1, rarityTier: 'Common' as const },
      { fishId: 'walleye', fishName: 'Walleye', weightLb: 6.5, rarityTier: 'Rare' as const },
      { fishId: 'ozark-muskie', fishName: 'Ozark Muskie', weightLb: 21.2, rarityTier: 'Legendary' as const }
    ];

    const replays = [
      {
        id: 'a',
        createdAt: 1,
        fishId: 'walleye',
        fishName: 'Walleye',
        rarityTier: 'Rare' as const,
        weightLb: 6.5,
        spotId: 'open-water' as const,
        weather: 'overcast' as const,
        timeOfDay: 'night' as const,
        playerLevel: 4,
        seed: 1,
        hookQuality: 'good' as const,
        initialFishStamina: 100,
        finalFishStamina: 0,
        maxTension: 0.92,
        fightDurationMs: 2800,
        eventLog: [],
        samples: []
      },
      {
        id: 'b',
        createdAt: 2,
        fishId: 'ozark-muskie',
        fishName: 'Ozark Muskie',
        rarityTier: 'Legendary' as const,
        weightLb: 21.2,
        spotId: 'open-water' as const,
        weather: 'light_rain' as const,
        timeOfDay: 'night' as const,
        playerLevel: 5,
        seed: 2,
        hookQuality: 'perfect' as const,
        initialFishStamina: 130,
        finalFishStamina: 0,
        maxTension: 1.08,
        fightDurationMs: 4600,
        eventLog: [],
        samples: []
      }
    ];

    const highlights = detectSessionHighlights(catches, replays);
    expect(highlights.length).toBe(3);
    expect(highlights.some((h) => h.type === 'biggest_fish' && h.fishId === 'ozark-muskie')).toBe(true);
    expect(highlights.some((h) => h.type === 'rarest_fish' && h.fishId === 'ozark-muskie')).toBe(true);
    expect(highlights.some((h) => h.type === 'dramatic_fight' && h.replayId === 'b')).toBe(true);
  });
});
