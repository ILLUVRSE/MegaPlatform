import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArtworkCard } from '@/components/artwork-card';
import { Card } from '@/components/ui/card';
import { SectionTitle } from '@/components/ui/section-title';
import { Tag } from '@/components/ui/tag';
import { ZoomableImage } from '@/components/zoomable-image';
import { getArtworkBySlug, getRelatedWorks } from '@/lib/data';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const artwork = getArtworkBySlug(slug);

  if (!artwork) {
    return {
      title: 'Artwork Not Found',
      description: 'Requested artwork could not be found.'
    };
  }

  return {
    title: artwork.title,
    description: `${artwork.title} (${artwork.year ?? 'Unknown year'}) - ${artwork.institution}`,
    openGraph: {
      title: `Bingham Atlas — ${artwork.title}`,
      description: artwork.description,
      images: [
        {
          url: artwork.image.url,
          width: artwork.image.width,
          height: artwork.image.height,
          alt: artwork.title
        }
      ]
    }
  };
}

export default async function ArtworkDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artwork = getArtworkBySlug(slug);

  if (!artwork) {
    notFound();
  }

  const related = getRelatedWorks(artwork, 3);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: artwork.title,
    creator: {
      '@type': 'Person',
      name: 'George Caleb Bingham'
    },
    dateCreated: artwork.year ?? undefined,
    artform: artwork.medium,
    image: artwork.image.url,
    locationCreated: artwork.location,
    sourceOrganization: {
      '@type': 'Organization',
      name: artwork.institution
    },
    mainEntityOfPage: artwork.sourceUrl
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.45fr_1fr]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-river">{artwork.year ?? 'Unknown year'}</p>
          <h1 className="font-[var(--font-serif)] text-4xl font-semibold text-ink dark:text-white">{artwork.title}</h1>
          <p className="text-sm text-ink/75 dark:text-white/75">{artwork.description}</p>
          <div className="flex flex-wrap gap-2">
            {artwork.themes.map((theme) => (
              <Tag key={theme}>{theme}</Tag>
            ))}
          </div>
        </div>

        <ZoomableImage src={artwork.image.url} alt={artwork.title} width={artwork.image.width} height={artwork.image.height} />

        <Card className="p-5">
          <SectionTitle title="Context" subtitle="Grounded interpretive notes" />
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink/85 dark:text-white/85">
            {artwork.context.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </Card>
      </section>

      <aside className="space-y-5">
        <Card className="p-5">
          <SectionTitle title="Wall Label" subtitle="Artwork metadata" />
          <dl className="mt-4 grid grid-cols-[7.8rem_1fr] gap-y-2 text-sm">
            <dt className="font-semibold text-ink dark:text-white">Date</dt>
            <dd className="text-ink/80 dark:text-white/80">{artwork.year ?? 'Unknown'}</dd>

            <dt className="font-semibold text-ink dark:text-white">Medium</dt>
            <dd className="text-ink/80 dark:text-white/80">{artwork.medium || 'Unknown'}</dd>

            <dt className="font-semibold text-ink dark:text-white">Dimensions</dt>
            <dd className="text-ink/80 dark:text-white/80">{artwork.dimensions ?? 'Unknown'}</dd>

            <dt className="font-semibold text-ink dark:text-white">Institution</dt>
            <dd className="text-ink/80 dark:text-white/80">{artwork.institution}</dd>

            <dt className="font-semibold text-ink dark:text-white">Location</dt>
            <dd className="text-ink/80 dark:text-white/80">{artwork.location}</dd>

            <dt className="font-semibold text-ink dark:text-white">Verified</dt>
            <dd className="text-ink/80 dark:text-white/80">{artwork.lastVerified}</dd>
          </dl>
        </Card>

        <Card className="border-2 border-river/35 bg-river/5 p-5 dark:bg-river/10">
          <SectionTitle title="Rights & Credit" subtitle="Image use and attribution" />
          <p className="mt-2 text-sm text-ink/90 dark:text-white/90">{artwork.rights}</p>
          <p className="mt-1 text-xs text-ink/70 dark:text-white/70">{artwork.creditLine}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={artwork.sourceUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-river underline-offset-2 hover:underline">
              Open at source
            </a>
            <a href={artwork.image.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-river underline-offset-2 hover:underline">
              Open image
            </a>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Citations" subtitle="Source and references" />
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            <li>
              <a href={artwork.sourceUrl} target="_blank" rel="noreferrer" className="text-river underline-offset-2 hover:underline break-all">
                {artwork.sourceUrl}
              </a>
            </li>
            {artwork.referenceUrls.map((url) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noreferrer" className="text-river underline-offset-2 hover:underline break-all">
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </Card>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-[var(--font-serif)] text-2xl font-semibold text-ink dark:text-white">Related Works</h2>
            <Link href="/gallery" className="text-sm font-semibold text-river hover:underline">
              Open gallery
            </Link>
          </div>
          <div className="space-y-3">
            {related.map((work) => (
              <ArtworkCard key={work.slug} artwork={work} />
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
