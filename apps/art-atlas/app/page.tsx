import type { Metadata } from 'next';
import Link from 'next/link';
import { FeaturedCarousel } from '@/components/featured-carousel';
import { ThemeTiles } from '@/components/theme-tiles';
import { Card } from '@/components/ui/card';
import { SectionTitle } from '@/components/ui/section-title';
import { artistDirectory } from '@/lib/artists';
import { artworks, atlasMeta } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Home',
  description: 'Explore 101 iconic artists and composers, then dive into curated museum-style collections.',
  openGraph: {
    title: 'Art Atlas — Home',
    description: 'Start with a cross-era artist explorer and featured collection highlights.'
  }
};

export default function HomePage() {
  const painterCount = artistDirectory.filter((artist) => artist.discipline === 'Painter').length;
  const sculptorCount = artistDirectory.filter((artist) => artist.discipline === 'Sculptor').length;
  const composerCount = artistDirectory.filter((artist) => artist.discipline === 'Composer').length;
  const previewArtists = artistDirectory.slice(0, 15);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-10 sm:px-6">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-ink to-river p-6 text-white sm:p-10">
        <p className="text-xs uppercase tracking-[0.2em] text-white/80">Comprehensive Art App</p>
        <h1 className="mt-2 font-[var(--font-serif)] text-4xl font-semibold leading-tight sm:text-5xl">
          Explore 101 artists across painting, sculpture, and music
        </h1>
        <p className="mt-4 max-w-3xl text-sm text-white/90 sm:text-base">
          Use the Artist Explorer to browse painters, sculptors, and composers by period and region, then continue into the museum collection experience.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/artists" className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-parchment">
            Open artist explorer
          </Link>
          <Link href="/gallery" className="inline-flex rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
            Open featured collection
          </Link>
        </div>
      </Card>

      <section className="space-y-3">
        <SectionTitle title="Directory Snapshot" subtitle="Live totals from all 101 artists" />
        <div className="grid gap-3 sm:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-ink/60 dark:text-white/60">Total</p>
            <p className="mt-1 text-2xl font-semibold text-ink dark:text-white">{artistDirectory.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-ink/60 dark:text-white/60">Painters</p>
            <p className="mt-1 text-2xl font-semibold text-ink dark:text-white">{painterCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-ink/60 dark:text-white/60">Sculptors</p>
            <p className="mt-1 text-2xl font-semibold text-ink dark:text-white">{sculptorCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-ink/60 dark:text-white/60">Composers</p>
            <p className="mt-1 text-2xl font-semibold text-ink dark:text-white">{composerCount}</p>
          </Card>
        </div>
      </section>

      <ThemeTiles />
      <FeaturedCarousel artworks={artworks} />

      <section className="space-y-3">
        <SectionTitle title="Featured Collection Source" subtitle="George Caleb Bingham reference" />
        <Card className="p-4">
          <p className="mb-2 text-sm text-ink/80 dark:text-white/80">
            Featured collection biography source:
          </p>
          <a href={atlasMeta.furtherStudy.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-river underline-offset-2 hover:underline">
            {atlasMeta.furtherStudy.title}
          </a>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionTitle title="Artist Preview" subtitle="First 15 entries in the full directory" />
        <Card className="p-4">
          <ul className="flex flex-wrap gap-2">
            {previewArtists.map((artist) => (
              <li key={artist.name} className="rounded-full border border-ink/15 bg-parchment px-3 py-1 text-sm text-ink dark:border-white/20 dark:bg-slate dark:text-white">
                {artist.name}
              </li>
            ))}
          </ul>
          <Link href="/artists" className="mt-4 inline-flex text-sm font-semibold text-river underline-offset-2 hover:underline">
            View all 101 artists
          </Link>
        </Card>
      </section>
    </div>
  );
}
