import { artistDirectory } from '@/lib/artists';

export const FAVORITES_KEY_PREFIX = 'art-atlas:favorites:';

export type FavoriteKind = 'image' | 'audio';

export interface FavoriteMediaRecord {
  mediaUrl: string;
  title?: string;
  sourceUrl?: string;
  license?: string;
  thumbnailUrl?: string | null;
  creator?: string;
  savedAt?: string;
}

export interface ArtistFavoritesV2 {
  version: 2;
  image: FavoriteMediaRecord[];
  audio: FavoriteMediaRecord[];
}

export interface ArtistFavoritesLegacy {
  image?: string[];
  audio?: string[];
}

export function buildFavoritesStorageKey(artistSlug: string): string {
  return `${FAVORITES_KEY_PREFIX}${artistSlug}`;
}

export function parseArtistFavorites(value: string): ArtistFavoritesV2 {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return { version: 2, image: [], audio: [] };
    }

    const candidate = parsed as Partial<ArtistFavoritesV2 & ArtistFavoritesLegacy>;

    if (candidate.version === 2) {
      return {
        version: 2,
        image: normalizeRecordList(candidate.image),
        audio: normalizeRecordList(candidate.audio)
      };
    }

    return {
      version: 2,
      image: normalizeLegacyList(candidate.image),
      audio: normalizeLegacyList(candidate.audio)
    };
  } catch {
    return { version: 2, image: [], audio: [] };
  }
}

function normalizeRecordList(value: unknown): FavoriteMediaRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: FavoriteMediaRecord[] = [];

  value.forEach((entry) => {
    if (!entry || typeof entry !== 'object') {
      return;
    }
    const record = entry as Partial<FavoriteMediaRecord>;
    if (!record.mediaUrl || typeof record.mediaUrl !== 'string') {
      return;
    }
    normalized.push({
      mediaUrl: record.mediaUrl,
      title: typeof record.title === 'string' ? record.title : undefined,
      sourceUrl: typeof record.sourceUrl === 'string' ? record.sourceUrl : undefined,
      license: typeof record.license === 'string' ? record.license : undefined,
      thumbnailUrl: typeof record.thumbnailUrl === 'string' ? record.thumbnailUrl : null,
      creator: typeof record.creator === 'string' ? record.creator : undefined,
      savedAt: typeof record.savedAt === 'string' ? record.savedAt : undefined
    });
  });

  return normalized;
}

function normalizeLegacyList(value: unknown): FavoriteMediaRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((mediaUrl) => ({ mediaUrl }));
}

export function stringifyArtistFavorites(payload: ArtistFavoritesV2): string {
  return JSON.stringify(payload);
}

export interface CollectionFavoriteItem extends FavoriteMediaRecord {
  kind: FavoriteKind;
  artistSlug: string;
  artistName: string;
}

export function collectFavoritesFromStorage(storage: Storage): CollectionFavoriteItem[] {
  const artistBySlug = new Map(artistDirectory.map((artist) => [artist.slug, artist]));
  const all: CollectionFavoriteItem[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || !key.startsWith(FAVORITES_KEY_PREFIX)) {
      continue;
    }

    const artistSlug = key.slice(FAVORITES_KEY_PREFIX.length);
    const artist = artistBySlug.get(artistSlug);
    if (!artist) {
      continue;
    }

    const raw = storage.getItem(key);
    if (!raw) {
      continue;
    }

    const parsed = parseArtistFavorites(raw);

    parsed.image.forEach((item) => {
      all.push({ ...item, kind: 'image', artistSlug, artistName: artist.name });
    });
    parsed.audio.forEach((item) => {
      all.push({ ...item, kind: 'audio', artistSlug, artistName: artist.name });
    });
  }

  return all.sort((a, b) => {
    const nameDelta = a.artistName.localeCompare(b.artistName);
    if (nameDelta !== 0) {
      return nameDelta;
    }
    return (a.title ?? a.mediaUrl).localeCompare(b.title ?? b.mediaUrl);
  });
}
