import { NextResponse } from 'next/server';
import { getArtistBySlug } from '@/lib/artists';
import { getCacheMetadata, getCachedArtistMedia } from '@/lib/artist-media-cache';
import { fetchPublicDomainMedia, fetchPublicDomainMediaPage, type MediaKind } from '@/lib/public-media';

function parseKind(value: string | null): MediaKind {
  return value === 'audio' ? 'audio' : 'image';
}

function parseLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 50;
  }
  return Math.max(1, Math.min(1000, Math.floor(parsed)));
}

function parsePerPage(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 50;
  }
  return Math.max(1, Math.min(50, Math.floor(parsed)));
}

function parseBoolean(value: string | null): boolean {
  return value === '1' || value === 'true' || value === 'yes';
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artist = getArtistBySlug(slug);

  if (!artist) {
    return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
  }

  const url = new URL(request.url);
  const kind = parseKind(url.searchParams.get('kind'));
  const limit = parseLimit(url.searchParams.get('limit'));
  const perPage = parsePerPage(url.searchParams.get('perPage'));
  const all = parseBoolean(url.searchParams.get('all'));
  const cursor = url.searchParams.get('cursor');
  const refresh = parseBoolean(url.searchParams.get('refresh'));
  const cacheMetadata = getCacheMetadata();

  try {
    if (!refresh) {
      const cached = getCachedArtistMedia(artist.slug, kind, all ? limit : perPage);
      if (cached.length > 0 && !cursor) {
        return NextResponse.json({
          artist: {
            slug: artist.slug,
            name: artist.name,
            discipline: artist.discipline
          },
          kind,
          total: cached.length,
          nextCursor: null,
          exhausted: true,
          cached: true,
          cacheGeneratedAt: cacheMetadata.generatedAt,
          cacheSource: cacheMetadata.source,
          items: cached
        });
      }
    }

    if (all) {
      const result = await fetchPublicDomainMedia(artist.mediaQuery, kind, { maxItems: limit, maxPages: 100 });
      return NextResponse.json({
        artist: {
          slug: artist.slug,
          name: artist.name,
          discipline: artist.discipline
        },
        kind,
        total: result.items.length,
        nextCursor: result.nextCursor,
        exhausted: result.exhausted,
        cached: false,
        items: result.items
      });
    }

    const page = await fetchPublicDomainMediaPage(artist.mediaQuery, kind, { perPage, cursor });
    return NextResponse.json({
      artist: {
        slug: artist.slug,
        name: artist.name,
        discipline: artist.discipline
      },
      kind,
      total: page.items.length,
      nextCursor: page.nextCursor,
      exhausted: page.nextCursor === null,
      cached: false,
      items: page.items
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown media source error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
