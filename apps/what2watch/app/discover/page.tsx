import { getOrCreateUserServer } from '@/lib/auth';
import { getDiscoverQueue } from '@/lib/services/discover';
import { SwipeDeck } from '@/components/SwipeDeck';

export const metadata = {
  title: 'Discover | What2Watch',
  description: 'Zero-scroll swipe discovery mode.'
};

export default async function DiscoverPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { userId } = await getOrCreateUserServer();
  const platform = typeof params.platform === 'string' ? params.platform.trim() || undefined : undefined;
  const genre = typeof params.genre === 'string' ? params.genre.trim() || undefined : undefined;
  const runtimeBucket =
    typeof params.runtime === 'string' && ['short', 'medium', 'long'].includes(params.runtime)
      ? (params.runtime as 'short' | 'medium' | 'long')
      : undefined;
  const queue = await getDiscoverQueue(userId, { region: 'US', platform, genre, runtimeBucket });
  const paramsOut = new URLSearchParams();
  paramsOut.set('region', 'US');
  if (platform) paramsOut.set('platform', platform);
  if (genre) paramsOut.set('genre', genre);
  if (runtimeBucket) paramsOut.set('runtime', runtimeBucket);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Swipe discovery</h1>
      <p className="text-sm text-surf/70">Right: watchlist + like. Left: pass. Up: open details.</p>
      <form className="grid grid-cols-1 gap-2 sm:grid-cols-4">
        <input name="platform" placeholder="Platform (netflix)" defaultValue={platform} className="rounded-lg bg-white/10 px-3 py-2 text-sm" />
        <input name="genre" placeholder="Genre (Drama)" defaultValue={genre} className="rounded-lg bg-white/10 px-3 py-2 text-sm" />
        <select name="runtime" defaultValue={runtimeBucket || ''} className="rounded-lg bg-white/10 px-3 py-2 text-sm">
          <option value="">Runtime any</option>
          <option value="short">Short</option>
          <option value="medium">Medium</option>
          <option value="long">Long</option>
        </select>
        <button type="submit" className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-ink">
          Apply filters
        </button>
      </form>
      <SwipeDeck initialItems={queue} queryString={paramsOut.toString()} />
    </div>
  );
}
