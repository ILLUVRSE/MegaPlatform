import { redirect } from 'next/navigation';
import { Nav } from '../../components/Nav';

export default async function AdminPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const expected = process.env.ADMIN_TOKEN ?? 'dev-admin-token';

  if (token !== expected) {
    redirect('/?admin=unauthorized');
  }

  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const auth = encodeURIComponent(expected);
  const [logsResponse, dashboardResponse] = await Promise.all([
    fetch(`${base}/api/admin/logs?limit=30&token=${auth}`, { cache: 'no-store' }),
    fetch(`${base}/api/admin/dashboard?token=${auth}`, { cache: 'no-store' })
  ]);
  const logs = await logsResponse.json();
  const dashboard = await dashboardResponse.json();

  return (
    <section>
      <Nav />
      <h1 className="font-display text-3xl">Forge Admin</h1>
      <p className="mt-2 text-sm text-slate-700">Trigger queues through API endpoints and monitor operational metrics.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded border border-slate-300 bg-white/80 p-4">
          <h2 className="font-semibold">DAU (24h)</h2>
          <p>{dashboard.dailyActiveUsers}</p>
        </div>
        <div className="rounded border border-slate-300 bg-white/80 p-4">
          <h2 className="font-semibold">Engagement Rate</h2>
          <p>{dashboard.engagementRate}</p>
        </div>
        <div className="rounded border border-slate-300 bg-white/80 p-4">
          <h2 className="font-semibold">Top Clusters</h2>
          <p>{Array.isArray(dashboard.topClusters) ? dashboard.topClusters.length : 0}</p>
        </div>
      </div>
      <pre className="mt-6 max-h-96 overflow-auto rounded bg-ink p-4 text-xs text-white">{JSON.stringify(logs, null, 2)}</pre>
    </section>
  );
}
