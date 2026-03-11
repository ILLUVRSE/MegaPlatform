import Link from 'next/link';
import { getHomeFeed } from '@/lib/services/home';

export async function generateMetadata({ params }: { params: Promise<{ genre: string }> }) {
  const { genre } = await params;
  return {
    title: `Trending ${genre} titles | What2Watch`,
    description: `What to watch now in ${genre}.`
  };
}

export default async function GenrePage({ params }: { params: Promise<{ genre: string }> }) {
  const { genre } = await params;
  const feed = await getHomeFeed({ genre, region: 'US' });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Trending in {genre}</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {feed.explodingNow.map((item) => (
          <Link key={item.id} href={`/title/${item.type}/${item.tmdbId}`} className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
            <img src={item.poster} alt={item.name} className="aspect-[2/3] w-full object-cover" />
            <p className="line-clamp-1 p-2 text-sm">{item.name}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
