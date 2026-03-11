import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs, breadcrumbListJsonLd } from '@/components/breadcrumbs';
import { TaxonomyArtistListClient } from '@/components/taxonomy-artist-list-client';
import { Card } from '@/components/ui/card';
import { getArtistsByEraSlug } from '@/lib/artists';
import { eras, getEraBySlug } from '@/lib/eras';

export function generateStaticParams() {
  return eras.map((era) => ({ slug: era.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const era = getEraBySlug(slug);
  if (!era) {
    return { title: 'Era Not Found' };
  }
  return {
    title: `${era.name} Era`,
    description: `Explore artists connected to the ${era.name} era in Art Atlas.`,
    openGraph: {
      title: `Art Atlas — ${era.name} Era`,
      description: era.overview
    }
  };
}

export default async function EraPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const era = getEraBySlug(slug);
  if (!era) {
    notFound();
  }

  const artists = getArtistsByEraSlug(slug);
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Artists', href: '/artists' },
    { label: 'Eras' },
    { label: era.name }
  ];

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${era.name} Era`,
    description: era.overview,
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
        <p className="text-xs uppercase tracking-[0.2em] text-river">Era</p>
        <h1 className="font-[var(--font-serif)] text-4xl font-semibold text-ink dark:text-white">{era.name}</h1>
        <p className="text-sm text-ink/80 dark:text-white/80">{era.overview}</p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/artists" className="font-semibold text-river underline-offset-2 hover:underline">
            Back to all artists
          </Link>
        </div>
      </Card>

      <TaxonomyArtistListClient artists={artists} contextLabel={`${era.name} era artists`} />
    </div>
  );
}
