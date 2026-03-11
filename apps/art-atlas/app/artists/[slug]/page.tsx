import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArtistMediaBrowser } from '@/components/artist-media-browser';
import { Breadcrumbs, breadcrumbListJsonLd } from '@/components/breadcrumbs';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/tag';
import { getRelatedArtists } from '@/lib/artist-relations';
import { artistDirectory, getArtistBySlug } from '@/lib/artists';
import { slugifyTerm } from '@/lib/slug';

export function generateStaticParams() {
  return artistDirectory.map((artist) => ({ slug: artist.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const artist = getArtistBySlug(slug);

  if (!artist) {
    return { title: 'Artist Not Found' };
  }

  return {
    title: artist.name,
    description: `Public-domain gallery and classical listening experience for ${artist.name}.`,
    openGraph: {
      title: `Art Atlas — ${artist.name}`,
      description: `Browse public artwork and audio resources for ${artist.name}.`
    }
  };
}

export default async function ArtistDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artist = getArtistBySlug(slug);

  if (!artist) {
    notFound();
  }

  const artistType = artist.discipline === 'Composer' ? 'MusicGroup' : 'Person';
  const relatedArtists = getRelatedArtists(artist, 8);
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Artists', href: '/artists' },
    { label: artist.name }
  ];

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': artistType,
    name: artist.name,
    nationality: artist.region,
    description: `${artist.discipline} from ${artist.region} in the ${artist.period} period.`,
    url: `https://bingham-atlas.example/artists/${artist.slug}`
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbListJsonLd(breadcrumbs)) }} />
      <Breadcrumbs items={breadcrumbs} />

      <Card className="space-y-3 p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-river">Artist Profile</p>
        <h1 className="font-[var(--font-serif)] text-4xl font-semibold text-ink dark:text-white">{artist.name}</h1>
        <div className="flex flex-wrap gap-2">
          <Tag>{artist.discipline}</Tag>
          <Tag>{artist.era}</Tag>
          <Tag>{artist.movement}</Tag>
          <Tag>{artist.region}</Tag>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href={`/eras/${slugifyTerm(artist.era)}`} className="font-semibold text-river underline-offset-2 hover:underline">
            Browse era
          </Link>
          <Link href={`/movements/${slugifyTerm(artist.movement)}`} className="font-semibold text-river underline-offset-2 hover:underline">
            Browse movement
          </Link>
        </div>
        <p className="text-sm text-ink/75 dark:text-white/75">
          This page pulls public-domain media from external repositories and plays it directly in-app.
        </p>
        <Link href="/artists" className="inline-flex text-sm font-semibold text-river underline-offset-2 hover:underline">
          Back to artist explorer
        </Link>
      </Card>

      <section className="space-y-3">
        <h2 className="font-[var(--font-serif)] text-3xl font-semibold text-ink dark:text-white">Related Artists</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {relatedArtists.map((related) => (
            <Card key={related.slug} className="space-y-2 p-3">
              <p className="font-semibold text-ink dark:text-white">{related.name}</p>
              <div className="flex flex-wrap gap-2">
                <Tag>{related.movement}</Tag>
                <Tag>{related.era}</Tag>
              </div>
              <Link href={`/artists/${related.slug}`} className="text-sm font-semibold text-river underline-offset-2 hover:underline">
                Open artist
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <ArtistMediaBrowser artist={artist} />
    </div>
  );
}
