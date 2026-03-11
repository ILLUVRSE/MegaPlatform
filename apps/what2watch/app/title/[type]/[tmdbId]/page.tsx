import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TitleType } from '@prisma/client';
import { getOrCreateUserServer } from '@/lib/auth';
import { config } from '@/lib/config';
import { prisma } from '@/lib/prisma';
import { PlatformBadges } from '@/components/PlatformBadges';
import { TrendSparkline } from '@/components/TrendSparkline';
import { WatchlistToggleButton } from '@/components/WatchlistToggleButton';
import { getTitleBundle } from '@/lib/services/title';

export async function generateMetadata({
  params
}: {
  params: Promise<{ type: string; tmdbId: string }>;
}): Promise<Metadata> {
  const p = await params;
  if (!['movie', 'tv'].includes(p.type)) {
    return { title: 'Title Not Found | What2Watch' };
  }

  const data = await getTitleBundle(p.type as TitleType, Number(p.tmdbId), 'US');
  if (!data) {
    return { title: 'Title Not Found | What2Watch' };
  }

  return {
    title: `${data.name} (${data.year || 'TBA'}) | What2Watch`,
    description: data.aiSummary,
    openGraph: {
      title: `${data.name} | What2Watch`,
      description: data.aiSummary,
      images: [data.backdrop || data.poster]
    },
    alternates: {
      canonical: `${config.siteUrl}/title/${data.type}/${data.tmdbId}`
    }
  };
}

export default async function TitlePage({ params }: { params: Promise<{ type: string; tmdbId: string }> }) {
  const p = await params;
  if (!['movie', 'tv'].includes(p.type)) return notFound();

  const { userId } = await getOrCreateUserServer();
  const data = await getTitleBundle(p.type as TitleType, Number(p.tmdbId), 'US');
  if (!data) return notFound();
  const inWatchlist = await prisma.watchlist.findUnique({
    where: { userId_titleId: { userId, titleId: data.id } },
    select: { titleId: true }
  });
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': data.type === 'movie' ? 'Movie' : 'TVSeries',
    name: data.name,
    datePublished: data.year ? `${data.year}-01-01` : undefined,
    genre: data.genres,
    description: data.aiSummary,
    image: [data.poster, data.backdrop].filter(Boolean),
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: data.rating,
      ratingCount: data.voteCount
    },
    url: `${config.siteUrl}/title/${data.type}/${data.tmdbId}`
  };

  return (
    <div className="space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <section className="overflow-hidden rounded-2xl border border-white/15 bg-white/5">
        <div className="relative h-64 w-full sm:h-80">
          <Image src={data.backdrop} alt={data.name} fill className="object-cover" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold">{data.name}</h1>
              <p className="text-sm text-surf/80">
                {data.year || 'TBA'} · {data.runtime ? `${data.runtime} min` : 'Runtime TBA'} · Rating {data.rating.toFixed(1)}
              </p>
            </div>
            <WatchlistToggleButton titleId={data.id} initialInWatchlist={Boolean(inWatchlist)} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-lg font-semibold">Overview</h2>
            <p className="mt-2 text-sm text-surf/85">{data.overview}</p>
            <p className="mt-3 text-sm text-mint">{data.aiSummary}</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-lg font-semibold">Why trending</h2>
            <p className="mt-2 text-sm text-surf/85">{data.whyTrending}</p>
          </div>

          {data.headlines.length ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h2 className="text-lg font-semibold">Headlines</h2>
              <ul className="mt-2 space-y-2 text-sm">
                {data.headlines.map((h) => (
                  <li key={h.url}>
                    <a href={h.url} target="_blank" rel="noreferrer" className="text-surf hover:text-accent">
                      {h.title}
                    </a>
                    <p className="text-xs text-surf/60">
                      {h.source} · {new Date(h.publishedAt).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-lg font-semibold">Similar titles</h2>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {data.similar.map((s) => (
                <Link key={`${s.type}-${s.tmdbId}`} href={`/title/${s.type}/${s.tmdbId}`} className="text-xs">
                  <img src={s.poster} alt={s.name} className="aspect-[2/3] w-full rounded-lg object-cover" />
                  <p className="line-clamp-1 pt-1">{s.name}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold">Platforms</h3>
            <div className="mt-2">
              <PlatformBadges platforms={data.platforms.map((p) => p.platform)} />
            </div>
            <div className="mt-3 space-y-1 text-xs text-surf/70">
              {data.platforms.map((p) => (
                <a key={p.url} href={p.url} target="_blank" rel="noreferrer" className="block text-surf hover:text-accent">
                  Watch on {p.platform}
                </a>
              ))}
            </div>
          </div>

          {data.trailerKey ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold">Trailer</h3>
              <a
                href={`https://www.youtube.com/watch?v=${data.trailerKey}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block rounded-full bg-white/15 px-3 py-1 text-xs hover:bg-white/25"
              >
                Open trailer clip
              </a>
            </div>
          ) : null}

          <TrendSparkline points={data.trendHistory} />
        </aside>
      </section>
    </div>
  );
}
