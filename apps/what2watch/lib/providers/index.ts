import { config } from '@/lib/config';
import { stubStreamingProvider } from '@/lib/providers/availability.stub';
import { stubNewsProvider } from '@/lib/providers/news.stub';
import { rssNewsProvider } from '@/lib/providers/news.rss';
import { tmdbProvider } from '@/lib/providers/tmdb';

export const metadataProvider = tmdbProvider;
export const availabilityProvider = stubStreamingProvider;
export const newsProvider = config.newsProvider === 'rss' ? rssNewsProvider : stubNewsProvider;
