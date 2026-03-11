import { rankPublicMediaItems } from '@/lib/media-ranking';

export type MediaKind = 'image' | 'audio';

export interface PublicMediaItem {
  id: string;
  title: string;
  creator: string;
  mediaUrl: string;
  thumbnailUrl: string | null;
  sourceUrl: string;
  license: string;
  kind: MediaKind;
  width?: number;
  height?: number;
  description?: string;
  captureDate?: string;
  categories?: string[];
}

export interface PublicMediaPageResult {
  items: PublicMediaItem[];
  nextCursor: string | null;
}

export interface PublicMediaAggregateResult {
  items: PublicMediaItem[];
  nextCursor: string | null;
  exhausted: boolean;
}

const MEDIA_CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const mediaCache = new Map<string, { expiresAt: number; value: unknown }>();
const inFlight = new Map<string, Promise<unknown>>();

interface WikimediaPageInfo {
  pageid?: number;
  title?: string;
  categories?: Array<{ title?: string }>;
  imageinfo?: Array<{
    url?: string;
    thumburl?: string;
    descriptionurl?: string;
    mime?: string;
    width?: number;
    height?: number;
    extmetadata?: Record<string, { value?: string }>;
  }>;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function readMetadataValue(metadata: Record<string, { value?: string }> | undefined, key: string): string {
  const raw = metadata?.[key]?.value ?? '';
  return stripHtml(raw);
}

function isPublicDomainLicense(license: string): boolean {
  const normalized = license.toLowerCase();
  return (
    normalized.includes('public domain') ||
    normalized.includes('cc0') ||
    normalized.includes('pdm') ||
    normalized.includes('creative commons zero')
  );
}

function buildQuery(artistQuery: string, kind: MediaKind): string {
  if (kind === 'audio') {
    return `"${artistQuery}" (classical OR symphony OR concerto OR sonata OR opera) filetype:audio`;
  }
  return `"${artistQuery}" filetype:bitmap`;
}

function encodeCursor(value: Record<string, string>): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decodeCursor(cursor: string | null | undefined): Record<string, string> | null {
  if (!cursor) {
    return null;
  }
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string') {
        out[key] = value;
      }
    }
    return out;
  } catch {
    return null;
  }
}

function normalizeMediaItem(page: WikimediaPageInfo, kind: MediaKind): PublicMediaItem | null {
  const info = page.imageinfo?.[0];
  if (!info?.url) {
    return null;
  }

  const mime = info.mime ?? '';
  if (kind === 'audio' && !mime.startsWith('audio/')) {
    return null;
  }
  if (kind === 'image' && !mime.startsWith('image/')) {
    return null;
  }

  const metadata = info.extmetadata;
  const license =
    readMetadataValue(metadata, 'LicenseShortName') ||
    readMetadataValue(metadata, 'UsageTerms') ||
    readMetadataValue(metadata, 'License') ||
    'Unknown';

  if (!isPublicDomainLicense(license)) {
    return null;
  }

  const creator = readMetadataValue(metadata, 'Artist') || readMetadataValue(metadata, 'Credit') || 'Unknown creator';
  const description = readMetadataValue(metadata, 'ImageDescription') || readMetadataValue(metadata, 'ObjectName') || undefined;
  const captureDate = readMetadataValue(metadata, 'DateTime') || readMetadataValue(metadata, 'DateTimeOriginal') || undefined;
  const title = (page.title ?? 'Untitled').replace(/^File:/, '');
  const sourceUrl = info.descriptionurl ?? info.url;
  const id = String(page.pageid ?? sourceUrl);
  const categories = (page.categories ?? [])
    .map((entry) => entry.title?.replace(/^Category:/, '').trim())
    .filter((entry): entry is string => Boolean(entry));

  return {
    id,
    title,
    creator,
    mediaUrl: info.url,
    thumbnailUrl: info.thumburl ?? null,
    sourceUrl,
    license,
    kind,
    width: typeof info.width === 'number' ? info.width : undefined,
    height: typeof info.height === 'number' ? info.height : undefined,
    description,
    captureDate,
    categories
  };
}

function continuationFromPayload(payload: unknown): Record<string, string> | null {
  if (!payload || typeof payload !== 'object' || !('continue' in payload)) {
    return null;
  }
  const raw = (payload as { continue?: unknown }).continue;
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') {
      out[key] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

async function withMediaCache<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const cached = mediaCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }

  const pending = inFlight.get(key);
  if (pending) {
    return (await pending) as T;
  }

  const request = loader()
    .then((result) => {
      mediaCache.set(key, { expiresAt: Date.now() + MEDIA_CACHE_TTL_MS, value: result });
      inFlight.delete(key);
      return result;
    })
    .catch((error) => {
      inFlight.delete(key);
      throw error;
    });

  inFlight.set(key, request as Promise<unknown>);
  return request;
}

export async function fetchPublicDomainMediaPage(
  artistQuery: string,
  kind: MediaKind,
  options?: { perPage?: number; cursor?: string | null }
): Promise<PublicMediaPageResult> {
  const perPage = Math.max(1, Math.min(50, Math.floor(options?.perPage ?? 50)));
  const cursor = options?.cursor ?? null;
  const cacheKey = `page:${artistQuery}:${kind}:${perPage}:${cursor ?? ''}`;

  return withMediaCache(cacheKey, async () => {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      generator: 'search',
      gsrnamespace: '6',
      gsrlimit: String(perPage),
      gsrsearch: buildQuery(artistQuery, kind),
      prop: 'imageinfo|categories',
      iiprop: 'url|mime|extmetadata|size',
      iiurlwidth: '640'
    });
    params.set('cllimit', '50');
    const continuation = decodeCursor(cursor);
    if (continuation) {
      for (const [key, value] of Object.entries(continuation)) {
        params.set(key, value);
      }
    }

    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`, {
      headers: { 'User-Agent': 'ArtAtlas/1.0 (public-domain media explorer)' },
      next: { revalidate: 60 * 60 * 6 }
    });

    if (!response.ok) {
      throw new Error(`Wikimedia request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as {
      query?: { pages?: WikimediaPageInfo[] };
      continue?: Record<string, string>;
    };
    const pages = payload.query?.pages ?? [];
    const normalized = pages
      .map((page) => normalizeMediaItem(page, kind))
      .filter((entry): entry is PublicMediaItem => entry !== null);

    const deduped = Array.from(new Map(normalized.map((entry) => [entry.mediaUrl, entry])).values());
    const ranked = rankPublicMediaItems(deduped);
    const nextContinuation = continuationFromPayload(payload);

    return {
      items: ranked,
      nextCursor: nextContinuation ? encodeCursor(nextContinuation) : null
    };
  });
}

export async function fetchPublicDomainMedia(
  artistQuery: string,
  kind: MediaKind,
  options?: { maxItems?: number; maxPages?: number }
): Promise<PublicMediaAggregateResult> {
  const maxItems = Math.max(1, Math.min(3000, Math.floor(options?.maxItems ?? 1000)));
  const maxPages = Math.max(1, Math.min(100, Math.floor(options?.maxPages ?? 50)));
  const cacheKey = `all:${artistQuery}:${kind}:${maxItems}:${maxPages}`;

  return withMediaCache(cacheKey, async () => {
    let cursor: string | null = null;
    const items: PublicMediaItem[] = [];
    const seen = new Set<string>();
    let pagesFetched = 0;

    while (pagesFetched < maxPages && items.length < maxItems) {
      const page = await fetchPublicDomainMediaPage(artistQuery, kind, { perPage: 50, cursor });
      pagesFetched += 1;
      cursor = page.nextCursor;

      for (const item of page.items) {
        if (items.length >= maxItems) {
          break;
        }
        if (!seen.has(item.mediaUrl)) {
          seen.add(item.mediaUrl);
          items.push(item);
        }
      }

      if (!cursor) {
        break;
      }
    }

    return {
      items,
      nextCursor: cursor,
      exhausted: cursor === null
    };
  });
}
