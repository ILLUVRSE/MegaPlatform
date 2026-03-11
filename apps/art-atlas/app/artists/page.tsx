import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs, breadcrumbListJsonLd } from '@/components/breadcrumbs';
import { ArtistDirectoryClient } from '@/components/artist-directory-client';
import { Card } from '@/components/ui/card';
import { artistDirectory } from '@/lib/artists';
import { eras } from '@/lib/eras';
import { movements } from '@/lib/movements';

export const metadata: Metadata = {
  title: 'Artists',
  description: 'Explore 101 major artists and composers by discipline, period, and region.',
  openGraph: {
    title: 'Art Atlas — Artists',
    description: 'A searchable directory of painters, sculptors, and composers.'
  }
};

export default function ArtistsPage() {
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Artists' }
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbListJsonLd(breadcrumbs)) }} />
      <Breadcrumbs items={breadcrumbs} />

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="space-y-3 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-river">Browse by Era</p>
          <div className="flex flex-wrap gap-2">
            {eras.map((era) => (
              <Link key={era.slug} href={`/eras/${era.slug}`} className="rounded-full border border-ink/20 px-3 py-1 text-sm font-semibold text-ink hover:border-river dark:border-white/20 dark:text-white">
                {era.name}
              </Link>
            ))}
          </div>
        </Card>
        <Card className="space-y-3 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-river">Browse by Movement</p>
          <div className="flex flex-wrap gap-2">
            {movements.slice(0, 12).map((movement) => (
              <Link key={movement.slug} href={`/movements/${movement.slug}`} className="rounded-full border border-ink/20 px-3 py-1 text-sm font-semibold text-ink hover:border-river dark:border-white/20 dark:text-white">
                {movement.name}
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <ArtistDirectoryClient artists={artistDirectory} />
    </div>
  );
}
