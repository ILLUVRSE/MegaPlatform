import { ClusterCard } from '../components/ClusterCard';
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

export default async function HomePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const page = Math.max(0, Number(params.page ?? 0));
  const clusters = await getClusters('global', page);

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
