import { TitleType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { metadataProvider } from '@/lib/providers';
import { MetadataTitle } from '@/lib/providers/contracts';

async function upsertTitle(item: MetadataTitle): Promise<void> {
  const title = await prisma.title.upsert({
    where: {
      tmdbId_type: {
        tmdbId: item.tmdbId,
        type: item.type
      }
    },
    update: {
      name: item.name,
      overview: item.overview,
      posterPath: item.posterPath,
      backdropPath: item.backdropPath,
      releaseDate: item.releaseDate,
      runtime: item.runtime,
      tmdbPopularity: item.tmdbPopularity,
      tmdbVoteAverage: item.tmdbVoteAverage,
      tmdbVoteCount: item.tmdbVoteCount
    },
    create: {
      tmdbId: item.tmdbId,
      type: item.type,
      name: item.name,
      overview: item.overview,
      posterPath: item.posterPath,
      backdropPath: item.backdropPath,
      releaseDate: item.releaseDate,
      runtime: item.runtime,
      tmdbPopularity: item.tmdbPopularity,
      tmdbVoteAverage: item.tmdbVoteAverage,
      tmdbVoteCount: item.tmdbVoteCount
    }
  });

  if (!item.genreIds.length) return;

  const genres = await prisma.genre.findMany({ where: { tmdbGenreId: { in: item.genreIds } } });
  const genreByTmdb = new Map(genres.map((g) => [g.tmdbGenreId, g.id]));

  await prisma.titleGenre.deleteMany({ where: { titleId: title.id } });
  await prisma.titleGenre.createMany({
    data: item.genreIds
      .map((genreId) => genreByTmdb.get(genreId))
      .filter(Boolean)
      .map((genreId) => ({
        titleId: title.id,
        genreId: genreId as string
      })),
    skipDuplicates: true
  });
}

export async function syncGenres(): Promise<void> {
  for (const type of ['movie', 'tv'] as TitleType[]) {
    const genres = await metadataProvider.getGenres(type);
    for (const genre of genres) {
      await prisma.genre.upsert({
        where: { tmdbGenreId: genre.id },
        update: { name: genre.name },
        create: { tmdbGenreId: genre.id, name: genre.name }
      });
    }
  }
}

export async function syncTmdbLists(): Promise<{ synced: number }> {
  const [trendingAll, popularMovies, popularTv] = await Promise.all([
    metadataProvider.getTrending('all', 'day', 1),
    metadataProvider.getPopular('movie', 1),
    metadataProvider.getPopular('tv', 1)
  ]);

  const combined = [...trendingAll, ...popularMovies, ...popularTv];
  const unique = new Map<string, MetadataTitle>();

  for (const item of combined) {
    unique.set(`${item.type}:${item.tmdbId}`, item);
  }

  for (const item of unique.values()) {
    const details = await metadataProvider.getDetails(item.type, item.tmdbId);
    await upsertTitle(details || item);
  }

  return { synced: unique.size };
}
