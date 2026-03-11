import { prisma } from '@/lib/prisma';

export async function createNotificationEvent(input: {
  userId: string;
  titleId?: string;
  type: 'watchlist_added' | 'watchlist_removed' | 'leaving_soon';
  payload: Record<string, unknown>;
}): Promise<void> {
  await prisma.notificationEvent.create({
    data: {
      userId: input.userId,
      titleId: input.titleId,
      type: input.type,
      payload: input.payload
    }
  });
}

export async function getNotificationEvents(userId: string): Promise<Array<{
  id: string;
  type: string;
  titleId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
}>> {
  const rows = await prisma.notificationEvent.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    titleId: row.titleId,
    payload: row.payload as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt ? row.readAt.toISOString() : null
  }));
}

export async function markNotificationRead(userId: string, id: string): Promise<void> {
  await prisma.notificationEvent.updateMany({
    where: { id, userId },
    data: { readAt: new Date() }
  });
}

export async function createLeavingSoonNotifications(region = 'US'): Promise<number> {
  const deadline = new Date(Date.now() + 7 * 86400000);
  const watchlisted = await prisma.watchlist.findMany({
    include: {
      user: true,
      title: {
        include: {
          availability: {
            where: {
              region,
              leavingDate: { lte: deadline, gte: new Date() }
            },
            orderBy: { leavingDate: 'asc' },
            take: 1
          }
        }
      }
    }
  });

  let created = 0;
  for (const row of watchlisted) {
    const leave = row.title.availability[0];
    if (!leave?.leavingDate) continue;

    const existing = await prisma.notificationEvent.findFirst({
      where: {
        userId: row.userId,
        titleId: row.titleId,
        type: 'leaving_soon',
        createdAt: { gte: new Date(Date.now() - 24 * 86400000) }
      }
    });
    if (existing) continue;

    await prisma.notificationEvent.create({
      data: {
        userId: row.userId,
        titleId: row.titleId,
        type: 'leaving_soon',
        payload: {
          message: `${row.title.name} leaves ${leave.platform} soon`,
          platform: leave.platform,
          leavingDate: leave.leavingDate.toISOString(),
          region
        }
      }
    });
    created += 1;
  }

  return created;
}
