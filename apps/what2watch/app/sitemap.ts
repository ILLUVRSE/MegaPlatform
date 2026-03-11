import type { MetadataRoute } from 'next';
import { config } from '@/lib/config';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = config.siteUrl;
  const staticRoutes = ['/', '/discover', '/watchlist'];
  const titles = await prisma.title.findMany({
    select: { type: true, tmdbId: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 200
  });

  const titleRoutes = titles.map((t) => ({
    url: `${base}/title/${t.type}/${t.tmdbId}`,
    lastModified: t.updatedAt,
    changeFrequency: 'daily' as const,
    priority: 0.8
  }));

  return [
    ...staticRoutes.map((route) => ({
      url: `${base}${route}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9
    })),
    ...titleRoutes
  ];
}
