import Link from 'next/link';
import { getHomeFeed } from '@/lib/services/home';
import { platformLabel } from '@/lib/platforms';

export async function generateMetadata({ params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const label = platformLabel(platform);
  return {
    title: `What's trending on ${label} today | What2Watch`,
    description: `Live trending picks on ${label} today.`
  };
}

export default async function PlatformPage({ params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const label = platformLabel(platform);
  const feed = await getHomeFeed({ platform, region: 'US' });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">What&apos;s trending on {label} today</h1>
      <p className="text-sm text-surf/70">Server-rendered SEO page with fresh TrendScore rankings.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {feed.explodingNow.map((item) => (
          <Link key={item.id} href={`/title/${item.type}/${item.tmdbId}`} className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
            <img src={item.poster} alt={item.name} className="aspect-[2/3] w-full object-cover" />
            <div className="p-2 text-sm">
              <p className="line-clamp-1">{item.name}</p>
              <p className="text-xs text-surf/70">Trend {item.trendScore.toFixed(2)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
