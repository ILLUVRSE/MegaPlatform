import { exportPhotoModePng } from './photoMode';
import type { RarityTier } from './types';

export interface CatchCardInput {
  fishId: string;
  fishName: string;
  fishArtGlyph: string;
  speciesRenderKey?: string;
  weightLb: number;
  rarityTier: RarityTier;
  spotName: string;
  weather: string;
  timeOfDay: string;
  level: number;
  dateLabel: string;
  bobberSkinId?: string;
  lureSkinId?: string;
}

export interface CatchCardResult {
  width: number;
  height: number;
  metadata: string;
  blob: Blob;
}

export function buildCatchCardMetadata(input: CatchCardInput): string {
  const family = input.fishId.includes('bass')
    ? 'bass'
    : input.fishId.includes('catfish')
      ? 'catfish'
      : input.fishId.includes('trout')
        ? 'trout'
        : input.fishId.includes('carp')
          ? 'carp'
          : 'panfish';
  return [
    'GameGrid',
    'Ozark Fishing',
    `Fish:${input.fishName}`,
    `Render:${input.speciesRenderKey ?? `fish-${family}-hero`}`,
    `Weight:${input.weightLb.toFixed(2)} lb`,
    `Rarity:${input.rarityTier}`,
    `Theme:${family}`,
    `Caught at ${input.spotName} - ${input.weather} - ${input.timeOfDay}`,
    `Cosmetics:${input.bobberSkinId ?? 'default'}|${input.lureSkinId ?? 'default'}`,
    `Level:${input.level}`,
    `Date:${input.dateLabel}`
  ].join('|');
}

export async function renderCatchCardPng(input: CatchCardInput): Promise<CatchCardResult> {
  const width = 1200;
  const height = 1200;
  const metadata = buildCatchCardMetadata(input);
  const blob = await exportPhotoModePng({
    width,
    height,
    filter: 'none',
    title: metadata,
    overlayInfo: {
      species: input.fishName,
      weightLabel: `${input.weightLb.toFixed(2)} lb`,
      rarity: input.rarityTier,
      spot: input.spotName,
      weather: input.weather,
      dateLabel: input.dateLabel
    }
  });

  return {
    width,
    height,
    metadata,
    blob
  };
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
