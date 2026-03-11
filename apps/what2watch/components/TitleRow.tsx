import Image from 'next/image';
import Link from 'next/link';
import { FeedCard } from '@/lib/services/home';
import { PlatformBadges } from '@/components/PlatformBadges';

export function TitleRow({ title, items }: { title: string; items: FeedCard[] }) {
  if (!items.length) return null;
  return (
    <section className="rise-in space-y-3">
      <h2 className="text-xl font-semibold text-surf">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item) => (
          <Link
            key={`${item.type}-${item.tmdbId}`}
            href={`/title/${item.type}/${item.tmdbId}`}
            className="group overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:scale-[1.02]"
          >
            <div className="relative aspect-[2/3] w-full">
              <Image src={item.poster} alt={item.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 20vw" />
            </div>
            <div className="space-y-2 p-3">
              <p className="line-clamp-1 text-sm font-semibold text-surf">{item.name}</p>
              <p className="text-xs text-surf/70">Rating {item.rating.toFixed(1)} · Trend {item.trendScore.toFixed(2)}</p>
              <PlatformBadges platforms={item.platforms.slice(0, 3)} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
