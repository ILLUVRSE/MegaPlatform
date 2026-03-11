import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { SectionTitle } from '@/components/ui/section-title';
import { artworks } from '@/lib/data';
import type { Artwork } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Timeline',
  description: 'Chronological and decade-grouped view of George Caleb Bingham artworks.',
  openGraph: {
    title: 'Bingham Atlas — Timeline',
    description: 'Follow Bingham works grouped by decade with visual previews.'
  }
};

function groupByDecade(items: Artwork[]): Map<string, Artwork[]> {
  const map = new Map<string, Artwork[]>();

  for (const artwork of items) {
    const key = artwork.year === null ? 'Unknown date' : `${Math.floor(artwork.year / 10) * 10}s`;
    const current = map.get(key) ?? [];
    current.push(artwork);
    map.set(key, current);
  }

  return new Map(
    [...map.entries()].sort((a, b) => {
      if (a[0] === 'Unknown date') return 1;
      if (b[0] === 'Unknown date') return -1;
      return Number(a[0].slice(0, 4)) - Number(b[0].slice(0, 4));
    })
  );
}

export default function TimelinePage() {
  const groups = groupByDecade(artworks);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <SectionTitle title="Timeline" subtitle="Decade grouping with direct links to detail pages" />
      <div className="space-y-4">
        {[...groups.entries()].map(([decade, entries], index) => (
          <details key={decade} open={index < 2} className="group">
            <summary className="cursor-pointer list-none rounded-xl border border-ink/15 bg-white px-4 py-3 font-[var(--font-serif)] text-2xl font-semibold text-ink dark:border-white/10 dark:bg-slate dark:text-white">
              {decade}
              <span className="ml-2 text-sm font-sans text-ink/70 dark:text-white/70">({entries.length} works)</span>
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((artwork) => (
                <Card key={artwork.slug} className="overflow-hidden">
                  <Link href={`/artwork/${artwork.slug}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-river">
                    <Image
                      src={artwork.image.url}
                      alt={artwork.title}
                      width={artwork.image.width}
                      height={artwork.image.height}
                      className="h-auto w-full object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="space-y-1 p-3">
                      <p className="text-xs uppercase tracking-wide text-river">{artwork.year ?? 'Unknown year'}</p>
                      <h2 className="font-[var(--font-serif)] text-xl font-semibold text-ink dark:text-white">{artwork.title}</h2>
                      <p className="text-sm text-ink/75 dark:text-white/75">{artwork.institution}</p>
                    </div>
                  </Link>
                </Card>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
