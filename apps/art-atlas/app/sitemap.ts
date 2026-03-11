import type { MetadataRoute } from 'next';
import { artistDirectory } from '@/lib/artists';
import { artworks } from '@/lib/data';
import { eras } from '@/lib/eras';
import { movements } from '@/lib/movements';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://bingham-atlas.example';
  const staticRoutes = ['', '/artists', '/collection', '/gallery', '/timeline', '/sources'];

  return [
    ...staticRoutes.map((route) => ({
      url: `${baseUrl}${route}`,
      changeFrequency: 'monthly' as const,
      priority: route === '' ? 1 : 0.7
    })),
    ...artworks.map((artwork) => ({
      url: `${baseUrl}/artwork/${artwork.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6
    })),
    ...artistDirectory.map((artist) => ({
      url: `${baseUrl}/artists/${artist.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.65
    })),
    ...eras.map((era) => ({
      url: `${baseUrl}/eras/${era.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6
    })),
    ...movements.map((movement) => ({
      url: `${baseUrl}/movements/${movement.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6
    }))
  ];
}
