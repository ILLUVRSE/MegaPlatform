import { Nav } from '../../components/Nav';

export default async function MyBriefingPage({
  searchParams
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const { userId = '' } = await searchParams;
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const response = await fetch(`${base}/api/personalized?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' });
  const data = await response.json();
  const items = Array.isArray(data.items) ? data.items : [];

  return (
    <section>
      <Nav />
      <h1 className="font-display text-3xl">My Briefing</h1>
      <form className="mt-4">
        <input name="userId" defaultValue={userId} className="w-full rounded border border-slate-400 p-2" placeholder="Enter userId" />
      </form>
      <ul className="mt-6 space-y-3">
        {items.map((cluster: { id: string; title: string; personalizedScore: number }) => (
          <li key={cluster.id} className="rounded border border-slate-300 bg-white/70 p-3">
            <a href={`/cluster/${cluster.id}`} className="font-semibold underline">
              {cluster.title}
            </a>
            <p className="text-xs text-slate-600">Personalized score: {cluster.personalizedScore}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
