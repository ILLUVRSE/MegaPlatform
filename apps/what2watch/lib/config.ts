export const config = {
  tmdbApiKey: process.env.TMDB_API_KEY || '',
  jobSecret: process.env.JOB_SECRET || 'dev-secret',
  availabilityProvider: process.env.AVAILABILITY_PROVIDER || 'stub',
  newsProvider: process.env.NEWS_PROVIDER || 'stub',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
};

export const trendWeights = {
  trending: 0.35,
  popularity: 0.25,
  rating: 0.2,
  recency: 0.15,
  engagement: 0.05
};
