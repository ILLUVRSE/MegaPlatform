import cachePayload from '@/data/artist-media-cache.json';
import type { MediaKind, PublicMediaItem } from '@/lib/public-media';

interface CachedArtistEntry {
  image?: PublicMediaItem[];
  audio?: PublicMediaItem[];
}

interface ArtistMediaCacheDocument {
  generatedAt: string;
  source: string;
  artists: Record<string, CachedArtistEntry>;
}

const cache = cachePayload as ArtistMediaCacheDocument;

export function getCacheMetadata() {
  return {
    generatedAt: cache.generatedAt,
    source: cache.source
  };
}

export function getCachedArtistMedia(slug: string, kind: MediaKind, limit?: number): PublicMediaItem[] {
  const artistEntry = cache.artists[slug];
  if (!artistEntry) {
    return [];
  }

  const items = (kind === 'audio' ? artistEntry.audio : artistEntry.image) ?? [];
  if (typeof limit === 'number') {
    return items.slice(0, Math.max(0, Math.floor(limit)));
  }
  return items;
}
