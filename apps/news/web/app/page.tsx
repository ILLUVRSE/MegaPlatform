import { ClusterCard } from '../components/ClusterCard';
import { EmbedActions } from '../components/EmbedActions';
import { Nav } from '../components/Nav';

async function getClusters(type: 'global' | 'vertical' | 'local', page: number) {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const limit = 20;
  const offset = page * limit;
  const response = await fetch(`${base}/api/clusters?type=${type}&limit=${limit}&offset=${offset}`, { cache: 'no-store' });
  if (!response.ok) {
    return [];
  }

  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ page?: string; embed?: string }> }) {
  const params = await searchParams;
  const page = Math.max(0, Number(params.page ?? 0));
  const isEmbed = params.embed === 'illuvrse';
  const clusters = await getClusters('global', page);
  const hero = clusters[0] as { id: string; title: string; summaryBullets: unknown } | undefined;
  const forYou = clusters.slice(1, 6) as { id: string; title: string; summaryBullets: unknown }[];
  const liveNow = clusters.slice(6, 11) as { id: string; title: string; summaryBullets: unknown }[];
  const editorsPicks = clusters.slice(11, 16) as { id: string; title: string; summaryBullets: unknown }[];

  if (isEmbed && hero) {
    const heroBullets = Array.isArray(hero.summaryBullets) ? hero.summaryBullets : [];

    return (
      <section className="space-y-10 overflow-hidden bg-[linear-gradient(180deg,#05070d_0%,#09131d_45%,#0e1724_100%)] text-white">
        <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(127,255,212,0.24),rgba(3,7,18,0.96)_52%),linear-gradient(180deg,rgba(1,6,17,0.4),rgba(2,6,23,0.9))] px-6 py-8 shadow-[0_20px_80px_rgba(0,0,0,0.45)] md:px-10 md:py-12">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_center,rgba(73,178,162,0.20),transparent_60%)] md:block" />
          <div className="relative grid gap-8 md:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)] md:items-end">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-3 rounded-full border border-[#7fffd4]/25 bg-[#7fffd4]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#c9fff1]">
                <span className="h-2 w-2 rounded-full bg-[#7fffd4] shadow-[0_0_16px_rgba(127,255,212,0.9)]" />
                Platform Pulse
              </div>
              <div className="space-y-4">
                <h1 className="max-w-4xl font-display text-5xl leading-none md:text-7xl">{hero.title}</h1>
                <p className="max-w-2xl text-base leading-7 text-white/75 md:text-lg">
                  {String(heroBullets[0] ?? 'Editorial coverage, podcast intelligence, and live signals rebuilt for the ILLUVRSE shell.')}
                </p>
              </div>
              <EmbedActions storyId={hero.id} storyTitle={hero.title} />
              <div className="flex flex-wrap gap-4 text-sm text-white/65">
                <div className="rounded-full border border-white/12 bg-white/6 px-4 py-2">Live blogs: 4 active</div>
                <div className="rounded-full border border-white/12 bg-white/6 px-4 py-2">Podcasts: 12 in rotation</div>
                <div className="rounded-full border border-white/12 bg-white/6 px-4 py-2">Friends reading: 3</div>
              </div>
            </div>
            <aside className="space-y-4 rounded-[24px] border border-white/10 bg-black/20 p-5 backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#c9fff1]">Friends live now</p>
              <div className="space-y-3">
                {['Ryan is listening to Daily Vertical', 'Ava is following live coverage', 'Marco saved this to Studio'].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75">
                    {item}
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <ClusterRail
          title="For You"
          description="Fast editorial picks with short-form density."
          clusters={forYou}
        />
        <ClusterRail
          title="Live Now"
          description="Rolling coverage, launches, and culture spikes."
          clusters={liveNow}
        />
        <ClusterRail
          title="Editors' Picks"
          description="Longer reads, interviews, and podcast-led briefing."
          clusters={editorsPicks}
        />

        <section className="sticky bottom-4 z-10 rounded-[24px] border border-[#7fffd4]/15 bg-[linear-gradient(90deg,rgba(5,10,18,0.92),rgba(10,22,32,0.96))] px-5 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#c9fff1]">Now Playing</p>
              <p className="mt-1 text-sm text-white/80">Daily Vertical: the overnight brief for gaming, culture, and platform momentum.</p>
            </div>
            <a
              href="/podcast/daily_vertical?embed=illuvrse"
              className="inline-flex items-center justify-center rounded-full bg-[#d7b56d] px-5 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-950"
            >
              Open Podcast
            </a>
          </div>
        </section>
      </section>
    );
  }

  return (
    <section>
      <Nav />
      <h1 className="font-display text-4xl">ILLUVRSE News</h1>
      <p className="mt-2 text-slate-700">Global top stories clustered with cross-source citations.</p>
      <div className="mt-6 grid gap-4">
        {clusters.map((cluster: { id: string; title: string; summaryBullets: unknown }) => (
          <ClusterCard key={cluster.id} id={cluster.id} title={cluster.title} summaryBullets={cluster.summaryBullets} />
        ))}
      </div>
      <div className="mt-6 flex gap-3">
        <a className="rounded bg-ink px-3 py-1 text-white" href={`/?page=${Math.max(0, page - 1)}`}>Prev</a>
        <a className="rounded bg-ink px-3 py-1 text-white" href={`/?page=${page + 1}`}>Next</a>
      </div>
    </section>
  );
}

function ClusterRail({
  title,
  description,
  clusters
}: {
  title: string;
  description: string;
  clusters: { id: string; title: string; summaryBullets: unknown }[];
}) {
  if (!clusters.length) return null;

  return (
    <section className="space-y-4 px-1">
      <div className="flex flex-col gap-2 px-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-display text-3xl">{title}</h2>
          <p className="mt-1 text-sm text-white/65">{description}</p>
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7fffd4]">Swipe for more</p>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-3">
        {clusters.map((cluster) => (
          <ClusterCard
            key={cluster.id}
            id={cluster.id}
            title={cluster.title}
            summaryBullets={cluster.summaryBullets}
            variant="embed"
          />
        ))}
      </div>
    </section>
  );
}
