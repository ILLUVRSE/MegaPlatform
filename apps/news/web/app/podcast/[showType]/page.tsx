import { Nav } from '../../../components/Nav';

export default async function PodcastPage({
  params,
  searchParams
}: {
  params: Promise<{ showType: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { showType } = await params;
  const search = await searchParams;
  const page = Math.max(0, Number(search.page ?? 0));
  const limit = 20;
  const offset = page * limit;

  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const response = await fetch(`${base}/api/podcast/${showType}?limit=${limit}&offset=${offset}`, { cache: 'no-store' });
  const episodes = await response.json();
  const rssMap: Record<string, string> = {
    daily_global: '/rss/global.xml',
    daily_vertical: '/rss/vertical.xml',
    daily_local: '/rss/local.xml',
    deep_dive: '/rss/vertical.xml',
    weekly_global: '/rss/global.xml',
    weekly_vertical: '/rss/vertical.xml',
    weekly_local: '/rss/local.xml'
  };

  return (
    <section>
      <Nav />
      <h1 className="font-display text-3xl">Podcast: {showType}</h1>
      <a className="mt-3 inline-block rounded bg-signal px-4 py-2 font-semibold" href={`${base}${rssMap[showType] ?? '/rss/vertical.xml'}`}>
        Subscribe RSS
      </a>
      <div className="mt-6 space-y-4">
        {(Array.isArray(episodes) ? episodes : []).map((episode: { id: string; title: string; description: string; audioUrl: string; publishedAt: string }) => (
          <article key={episode.id} className="rounded-xl border border-slate-300 bg-white/70 p-4">
            <h2 className="font-semibold">{episode.title}</h2>
            <p className="text-sm text-slate-700">{episode.description}</p>
            <audio className="mt-3 w-full" controls src={episode.audioUrl} />
            <p className="mt-2 text-xs text-slate-500">{new Date(episode.publishedAt).toLocaleString()}</p>
          </article>
        ))}
      </div>
      <div className="mt-6 flex gap-3">
        <a className="rounded bg-ink px-3 py-1 text-white" href={`/podcast/${showType}?page=${Math.max(0, page - 1)}`}>Prev</a>
        <a className="rounded bg-ink px-3 py-1 text-white" href={`/podcast/${showType}?page=${page + 1}`}>Next</a>
      </div>
    </section>
  );
}
