import { Nav } from '../../components/Nav';

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const [response, semanticResponse] = await Promise.all([
    fetch(`${base}/api/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' }),
    fetch(`${base}/api/search/semantic?q=${encodeURIComponent(q)}`, { cache: 'no-store' })
  ]);
  const clusters = await response.json();
  const semantic = await semanticResponse.json();

  return (
    <section>
      <Nav />
      <h1 className="font-display text-3xl">Search</h1>
      <form className="mt-4">
        <input name="q" defaultValue={q} className="w-full rounded border border-slate-400 p-2" placeholder="Search stories" />
      </form>
      <h2 className="mt-6 font-semibold">Keyword Results</h2>
      <ul className="mt-3 space-y-3">
        {(Array.isArray(clusters) ? clusters : []).map((cluster: { id: string; title: string }) => (
          <li key={cluster.id} className="rounded border border-slate-300 bg-white/70 p-3">
            <a href={`/cluster/${cluster.id}`} className="font-semibold underline">
              {cluster.title}
            </a>
          </li>
        ))}
      </ul>
      <h2 className="mt-8 font-semibold">Semantic Results</h2>
      <ul className="mt-3 space-y-3">
        {(Array.isArray(semantic) ? semantic : []).map((cluster: { id: string; title: string; similarity: number }) => (
          <li key={cluster.id} className="rounded border border-slate-300 bg-white/70 p-3">
            <a href={`/cluster/${cluster.id}`} className="font-semibold underline">
              {cluster.title}
            </a>
            <p className="text-xs text-slate-600">Similarity: {cluster.similarity}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
