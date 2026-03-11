import { getOrCreateUserServer } from '@/lib/auth';
import { getHomeFeed } from '@/lib/services/home';
import { TitleRow } from '@/components/TitleRow';

export default async function HomePage({
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

  const feed = await getHomeFeed({ userId, region: 'US', platform, genre, runtimeBucket });

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-white/15 bg-white/5 p-5">
        <h1 className="text-3xl font-bold">Live trend intelligence for what to watch next</h1>
        <p className="mt-2 text-sm text-surf/75">
          Exploding now, momentum risers, and fresh releases updated from TMDB + in-app activity.
        </p>
        <form className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-4">
          <input name="platform" placeholder="Platform (netflix)" defaultValue={platform} className="rounded-lg bg-white/10 px-3 py-2 text-sm" />
          <input name="genre" placeholder="Genre (Action)" defaultValue={genre} className="rounded-lg bg-white/10 px-3 py-2 text-sm" />
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
      </section>

      <TitleRow title="Exploding Now" items={feed.explodingNow} />
      <TitleRow title="Gaining Momentum" items={feed.gainingMomentum} />
      <TitleRow title="New This Week" items={feed.newThisWeek} />
      {feed.leavingSoon.length ? <TitleRow title="Leaving Soon" items={feed.leavingSoon} /> : null}
    </div>
  );
}
