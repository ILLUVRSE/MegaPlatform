import type { PublicMediaItem } from '@/lib/public-media';

function featuredCategoryBoost(item: PublicMediaItem): number {
  const categories = (item.categories ?? []).map((entry) => entry.toLowerCase());
  if (categories.some((entry) => entry.includes('featured pictures') || entry.includes('quality images'))) {
    return 80;
  }
  if (categories.some((entry) => entry.includes('valued images'))) {
    return 40;
  }
  return 0;
}

function metadataCompletenessScore(item: PublicMediaItem): number {
  let score = 0;
  if (item.creator && item.creator !== 'Unknown creator') {
    score += 20;
  }
  if (item.description) {
    score += 12;
  }
  if (item.captureDate) {
    score += 8;
  }
  if (item.license && item.license !== 'Unknown') {
    score += 8;
  }
  return score;
}

function sizeScore(item: PublicMediaItem): number {
  if (item.kind !== 'image') {
    return 0;
  }
  const width = item.width ?? 0;
  const height = item.height ?? 0;
  const area = width * height;

  if (area <= 0) {
    return -30;
  }
  if (area < 160_000) {
    return -20;
  }
  if (area < 640_000) {
    return 5;
  }
  if (area < 2_000_000) {
    return 20;
  }
  return 45;
}

function scoreItem(item: PublicMediaItem): number {
  return sizeScore(item) + featuredCategoryBoost(item) + metadataCompletenessScore(item);
}

export function rankPublicMediaItems(items: PublicMediaItem[]): PublicMediaItem[] {
  return [...items].sort((a, b) => {
    const delta = scoreItem(b) - scoreItem(a);
    if (delta !== 0) {
      return delta;
    }

    const titleDelta = a.title.localeCompare(b.title);
    if (titleDelta !== 0) {
      return titleDelta;
    }

    return a.mediaUrl.localeCompare(b.mediaUrl);
  });
}
