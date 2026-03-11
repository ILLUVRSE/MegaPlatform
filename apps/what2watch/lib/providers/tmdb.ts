import { TitleType } from '@prisma/client';
import { cacheGet, cacheSet } from '@/lib/cache';
import { config } from '@/lib/config';
import { MetadataProvider, MetadataTitle, TitleVideo } from '@/lib/providers/contracts';

type TMDBListItem = {
  id: number;
  media_type?: 'movie' | 'tv';
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  popularity?: number;
  vote_average?: number;
  vote_count?: number;
  genre_ids?: number[];
};

type TMDBVideo = {
  key: string;
  site: string;
  type: string;
  name: string;
};

const TMDB_BASE = 'https://api.themoviedb.org/3';

async function tmdbFetch<T>(path: string, ttl = 300): Promise<T> {
  const key = `tmdb:${path}`;
  const cached = await cacheGet<T>(key);
  if (cached) return cached;

  if (!config.tmdbApiKey) {
    throw new Error('TMDB_API_KEY is required');
  }

  const url = `${TMDB_BASE}${path}${path.includes('?') ? '&' : '?'}api_key=${config.tmdbApiKey}`;
  const res = await fetch(url, { next: { revalidate: ttl } });

  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 1000));
    const retry = await fetch(url);
    if (!retry.ok) throw new Error(`TMDB rate-limit retry failed: ${retry.status}`);
    const data = (await retry.json()) as T;
    await cacheSet(key, data, ttl);
    return data;
  }

  if (!res.ok) {
    throw new Error(`TMDB request failed (${res.status}) for ${path}`);
  }

  const data = (await res.json()) as T;
  await cacheSet(key, data, ttl);
  return data;
}

function toTitle(item: TMDBListItem, forcedType?: TitleType): MetadataTitle {
  const type = forcedType ?? (item.media_type === 'tv' ? 'tv' : 'movie');
  const dateString = type === 'tv' ? item.first_air_date : item.release_date;
  return {
    tmdbId: item.id,
    type,
    name: item.title || item.name || 'Untitled',
    overview: item.overview || '',
    posterPath: item.poster_path || null,
    backdropPath: item.backdrop_path || null,
    releaseDate: dateString ? new Date(dateString) : null,
    runtime: null,
    tmdbPopularity: item.popularity || 0,
    tmdbVoteAverage: item.vote_average || 0,
    tmdbVoteCount: item.vote_count || 0,
    genreIds: item.genre_ids || []
  };
}

class TMDBProvider implements MetadataProvider {
  async getTrending(type: 'all' | TitleType, window: 'day' | 'week', page = 1): Promise<MetadataTitle[]> {
    const data = await tmdbFetch<{ results: TMDBListItem[] }>(`/trending/${type}/${window}?page=${page}`, 120);
    return data.results
      .filter((r) => (r.media_type ? r.media_type !== 'person' : true))
      .map((r) => toTitle(r, type === 'all' ? undefined : type));
  }

  async getPopular(type: TitleType, page = 1): Promise<MetadataTitle[]> {
    const data = await tmdbFetch<{ results: TMDBListItem[] }>(`/${type}/popular?page=${page}`, 600);
    return data.results.map((r) => toTitle(r, type));
  }

  async getDetails(type: TitleType, tmdbId: number): Promise<MetadataTitle | null> {
    const data = await tmdbFetch<any>(`/${type}/${tmdbId}`, 3600);
    if (!data?.id) return null;
    return {
      tmdbId: data.id,
      type,
      name: data.title || data.name || 'Untitled',
      overview: data.overview || '',
      posterPath: data.poster_path || null,
      backdropPath: data.backdrop_path || null,
      releaseDate: data.release_date || data.first_air_date ? new Date(data.release_date || data.first_air_date) : null,
      runtime: type === 'movie' ? (data.runtime || null) : (data.episode_run_time?.[0] || null),
      tmdbPopularity: data.popularity || 0,
      tmdbVoteAverage: data.vote_average || 0,
      tmdbVoteCount: data.vote_count || 0,
      genreIds: (data.genres || []).map((g: { id: number }) => g.id)
    };
  }

  async getVideos(type: TitleType, tmdbId: number): Promise<TitleVideo[]> {
    const data = await tmdbFetch<{ results: TMDBVideo[] }>(`/${type}/${tmdbId}/videos`, 3600);
    return data.results || [];
  }

  async getRecommendations(type: TitleType, tmdbId: number): Promise<MetadataTitle[]> {
    const data = await tmdbFetch<{ results: TMDBListItem[] }>(`/${type}/${tmdbId}/recommendations?page=1`, 3600);
    return data.results.map((r) => toTitle(r, type));
  }

  async getSimilar(type: TitleType, tmdbId: number): Promise<MetadataTitle[]> {
    const data = await tmdbFetch<{ results: TMDBListItem[] }>(`/${type}/${tmdbId}/similar?page=1`, 3600);
    return data.results.map((r) => toTitle(r, type));
  }

  async getGenres(type: TitleType): Promise<Array<{ id: number; name: string }>> {
    const data = await tmdbFetch<{ genres: Array<{ id: number; name: string }> }>(`/genre/${type}/list`, 86400);
    return data.genres;
  }
}

export const tmdbProvider = new TMDBProvider();
