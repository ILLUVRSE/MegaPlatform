import { prisma } from '@/lib/prisma';
import { recordInteraction } from '@/lib/services/interactions';
import { createNotificationEvent } from '@/lib/services/notifications';

export async function getWatchlist(userId: string): Promise<Array<{ titleId: string; name: string; tmdbId: number; type: 'movie' | 'tv'; poster: string | null }>> {
  const rows = await prisma.watchlist.findMany({
    where: { userId },
    include: { title: true },
    orderBy: { createdAt: 'desc' }
  });

  return rows.map((row) => ({
    titleId: row.titleId,
    name: row.title.name,
    tmdbId: row.title.tmdbId,
    type: row.title.type,
    poster: row.title.posterPath
  }));
}

export async function addToWatchlist(userId: string, titleId: string): Promise<void> {
  const title = await prisma.title.findUnique({ where: { id: titleId }, select: { name: true, tmdbId: true, type: true } });
  await prisma.watchlist.upsert({
    where: {
      userId_titleId: {
        userId,
        titleId
      }
    },
    update: {},
    create: {
      userId,
      titleId
    }
  });

  await recordInteraction({ userId, titleId, type: 'watchlist_add' });
  await createNotificationEvent({
    userId,
    titleId,
    type: 'watchlist_added',
    payload: {
      message: 'Added to watchlist',
      titleName: title?.name || null,
      tmdbId: title?.tmdbId || null,
      contentType: title?.type || null
    }
  });
}

export async function removeFromWatchlist(userId: string, titleId: string): Promise<void> {
  const title = await prisma.title.findUnique({ where: { id: titleId }, select: { name: true, tmdbId: true, type: true } });
  await prisma.watchlist.deleteMany({ where: { userId, titleId } });
  await recordInteraction({ userId, titleId, type: 'watchlist_remove' });
  await createNotificationEvent({
    userId,
    titleId,
    type: 'watchlist_removed',
    payload: {
      message: 'Removed from watchlist',
      titleName: title?.name || null,
      tmdbId: title?.tmdbId || null,
      contentType: title?.type || null
    }
  });
}
