import { TitleType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { tmdbImage } from '@/lib/images';
import { metadataProvider, newsProvider } from '@/lib/providers';
import { whyTrending } from '@/lib/trending';

export async function getTitleBundle(type: TitleType, tmdbId: number, region = 'US') {
  const title = await prisma.title.findUnique({
    where: { tmdbId_type: { tmdbId, type } },
    include: {
      genres: { include: { genre: true } },
      availability: { where: { region } },
      trendSnapshots: { orderBy: { date: 'desc' }, take: 7 }
    }
  });

  if (!title) return null;

  const [videos, recommendations, similar, headlines] = await Promise.all([
    metadataProvider.getVideos(type, tmdbId),
    metadataProvider.getRecommendations(type, tmdbId),
    metadataProvider.getSimilar(type, tmdbId),
    newsProvider.getHeadlines(tmdbId, type, title.name)
  ]);

  const trailer = videos.find((v) => v.site === 'YouTube' && v.type.toLowerCase().includes('trailer')) || videos[0] || null;
  const lead = title.trendSnapshots[0];
  const combinedSimilar = [...recommendations, ...similar];
  const seenSimilar = new Set<string>();
  const dedupedSimilar = combinedSimilar.filter((item) => {
    const key = `${item.type}:${item.tmdbId}`;
    if (seenSimilar.has(key)) return false;
    seenSimilar.add(key);
    return true;
  });

  const aiSummary = `${title.name} is a ${title.genres.map((g) => g.genre.name).slice(0, 2).join('/')} ${type} about ${title.overview || 'a compelling journey'}. Best for fans of ${(recommendations[0]?.name || similar[0]?.name || 'character-driven stories')}.`;

  return {
    id: title.id,
    tmdbId: title.tmdbId,
    type: title.type,
    name: title.name,
    year: title.releaseDate?.getUTCFullYear() || null,
    runtime: title.runtime,
    overview: title.overview,
    poster: tmdbImage(title.posterPath, 'w500'),
    backdrop: tmdbImage(title.backdropPath, 'w780'),
    rating: title.tmdbVoteAverage,
    voteCount: title.tmdbVoteCount,
    genres: title.genres.map((g) => g.genre.name),
    platforms: title.availability.map((a) => ({
      platform: a.platform,
      url: a.url,
      leavingDate: a.leavingDate?.toISOString() || null
    })),
    trailerKey: trailer?.key || null,
    whyTrending: lead ? whyTrending(lead.components) : 'Trend data is still collecting.',
    trendHistory: title.trendSnapshots
      .map((s) => ({
        date: s.date.toISOString().slice(0, 10),
        trendScore: s.trendScore,
        momentum: s.momentum
      }))
      .reverse(),
    aiSummary,
    headlines,
    similar: dedupedSimilar
      .slice(0, 12)
      .map((item) => ({
        tmdbId: item.tmdbId,
        type: item.type,
        name: item.name,
        poster: tmdbImage(item.posterPath, 'w300')
      }))
  };
}
