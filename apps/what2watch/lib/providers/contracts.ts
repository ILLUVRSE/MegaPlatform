import { TitleType } from '@prisma/client';

export type MetadataTitle = {
  tmdbId: number;
  type: TitleType;
  name: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: Date | null;
  runtime: number | null;
  tmdbPopularity: number;
  tmdbVoteAverage: number;
  tmdbVoteCount: number;
  genreIds: number[];
};

export type TitleVideo = {
  key: string;
  site: string;
  type: string;
  name: string;
};

export type AvailabilityItem = {
  platform: string;
  region: string;
  url: string;
  leavingDate: Date | null;
};

export type NewsHeadline = {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
};

export interface MetadataProvider {
  getTrending(type: 'all' | TitleType, window: 'day' | 'week', page?: number): Promise<MetadataTitle[]>;
  getPopular(type: TitleType, page?: number): Promise<MetadataTitle[]>;
  getDetails(type: TitleType, tmdbId: number): Promise<MetadataTitle | null>;
  getVideos(type: TitleType, tmdbId: number): Promise<TitleVideo[]>;
  getRecommendations(type: TitleType, tmdbId: number): Promise<MetadataTitle[]>;
  getSimilar(type: TitleType, tmdbId: number): Promise<MetadataTitle[]>;
  getGenres(type: TitleType): Promise<Array<{ id: number; name: string }>>;
}

export interface StreamingProvider {
  getAvailability(tmdbId: number, type: TitleType, region: string): Promise<AvailabilityItem[]>;
}

export interface NewsProvider {
  getHeadlines(tmdbId: number, type: TitleType, name: string): Promise<NewsHeadline[]>;
}
