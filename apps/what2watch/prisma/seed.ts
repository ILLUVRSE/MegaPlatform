import { prisma } from '@/lib/prisma';
import { syncGenres, syncTmdbLists } from '@/lib/services/sync';
import { computeDailyTrends } from '@/lib/services/trends';
import { refreshAvailability } from '@/lib/services/availability';

async function seedFallback() {
  const genre = await prisma.genre.upsert({
    where: { tmdbGenreId: 18 },
    update: { name: 'Drama' },
    create: { tmdbGenreId: 18, name: 'Drama' }
  });

  const title = await prisma.title.upsert({
    where: { tmdbId_type: { tmdbId: 999001, type: 'movie' } },
    update: {},
    create: {
      tmdbId: 999001,
      type: 'movie',
      name: 'Fallback Signal',
      overview: 'Sample seed title when TMDB key is not configured.',
      posterPath: null,
      backdropPath: null,
      releaseDate: new Date(),
      runtime: 97,
      tmdbPopularity: 62,
      tmdbVoteAverage: 7.1,
      tmdbVoteCount: 1420
    }
  });

  await prisma.titleGenre.upsert({
    where: { titleId_genreId: { titleId: title.id, genreId: genre.id } },
    update: {},
    create: { titleId: title.id, genreId: genre.id }
  });
}

async function main() {
  if (process.env.TMDB_API_KEY) {
    await syncGenres();
    await syncTmdbLists();
    await computeDailyTrends();
    await refreshAvailability('US');
  } else {
    await seedFallback();
    await computeDailyTrends();
    await refreshAvailability('US');
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
