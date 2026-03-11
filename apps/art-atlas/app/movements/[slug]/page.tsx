import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs, breadcrumbListJsonLd } from '@/components/breadcrumbs';
import { TaxonomyArtistListClient } from '@/components/taxonomy-artist-list-client';
import { Card } from '@/components/ui/card';
import { getArtistsByMovementSlug } from '@/lib/artists';
import { getMovementBySlug, movements } from '@/lib/movements';

export function generateStaticParams() {
  return movements.map((movement) => ({ slug: movement.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const movement = getMovementBySlug(slug);
  if (!movement) {
    return { title: 'Movement Not Found' };
  }
  return {
    title: `${movement.name} Movement`,
    description: `Explore artists associated with ${movement.name} in Art Atlas.`,
    openGraph: {
      title: `Art Atlas — ${movement.name}`,
      description: movement.overview
    }
  };
}

export default async function MovementPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const movement = getMovementBySlug(slug);
  if (!movement) {
    notFound();
  }

  const artists = getArtistsByMovementSlug(slug);
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Artists', href: '/artists' },
    { label: 'Movements' },
    { label: movement.name }
  ];

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${movement.name} Movement`,
    description: movement.overview,
    itemListElement: artists.map((artist, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `https://bingham-atlas.example/artists/${artist.slug}`,
      name: artist.name
    }))
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbListJsonLd(breadcrumbs)) }} />

      <Breadcrumbs items={breadcrumbs} />

      <Card className="space-y-3 p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-river">Movement</p>
        <h1 className="font-[var(--font-serif)] text-4xl font-semibold text-ink dark:text-white">{movement.name}</h1>
        <p className="text-sm text-ink/80 dark:text-white/80">{movement.overview}</p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/artists" className="font-semibold text-river underline-offset-2 hover:underline">
            Back to all artists
          </Link>
        </div>
      </Card>

      <TaxonomyArtistListClient artists={artists} contextLabel={`${movement.name} movement artists`} />
    </div>
  );
}
