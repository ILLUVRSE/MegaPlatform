import { prisma } from '@/lib/prisma';
import { availabilityProvider } from '@/lib/providers';

export async function refreshAvailability(region = 'US'): Promise<{ updated: number }> {
  const titles = await prisma.title.findMany({ take: 200 });
  let updated = 0;

  for (const title of titles) {
    const items = await availabilityProvider.getAvailability(title.tmdbId, title.type, region);
    await prisma.availability.deleteMany({ where: { titleId: title.id, region } });

    if (items.length) {
      await prisma.availability.createMany({
        data: items.map((item) => ({
          titleId: title.id,
          platform: item.platform,
          region: item.region,
          url: item.url,
          leavingDate: item.leavingDate,
          lastCheckedAt: new Date()
        }))
      });
    }

    updated += 1;
  }

  return { updated };
}
