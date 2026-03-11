import { ClusterCard } from '../../components/ClusterCard';
import { Nav } from '../../components/Nav';

export default async function VerticalPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const page = Math.max(0, Number(params.page ?? 0));
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const limit = 20;
  const offset = page * limit;
  const response = await fetch(`${base}/api/clusters?type=vertical&limit=${limit}&offset=${offset}`, { cache: 'no-store' });
  const payload = response.ok ? await response.json() : [];
  const clusters = Array.isArray(payload) ? payload : [];

  return (
    <section>
      <Nav />
      <h1 className="font-display text-3xl">ILLUVRSE Vertical</h1>
      <div className="mt-6 grid gap-4">
        {clusters.map((cluster: { id: string; title: string; summaryBullets: unknown }) => (
          <ClusterCard key={cluster.id} id={cluster.id} title={cluster.title} summaryBullets={cluster.summaryBullets} />
        ))}
      </div>
      <div className="mt-6 flex gap-3">
        <a className="rounded bg-ink px-3 py-1 text-white" href={`/vertical?page=${Math.max(0, page - 1)}`}>Prev</a>
        <a className="rounded bg-ink px-3 py-1 text-white" href={`/vertical?page=${page + 1}`}>Next</a>
      </div>
    </section>
  );
}
