import { Nav } from '../../../components/Nav';

export default async function AdminTasksPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const expected = process.env.ADMIN_TOKEN ?? 'dev-admin-token';
  if (token !== expected) {
    return (
      <section>
        <Nav />
        <p>Unauthorized</p>
      </section>
    );
  }

  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const auth = encodeURIComponent(expected);
  const [tasksRes, costsRes] = await Promise.all([
    fetch(`${base}/api/admin/tasks?token=${auth}`, { cache: 'no-store' }),
    fetch(`${base}/api/admin/costs?token=${auth}`, { cache: 'no-store' })
  ]);
  const tasks = await tasksRes.json();
  const costs = await costsRes.json();

  return (
    <section>
      <Nav />
      <h1 className="font-display text-3xl">Admin Tasks + Costs</h1>
      <p className="mt-2 text-sm">Total estimated cost: {costs.totalCost}</p>
      <pre className="mt-4 max-h-80 overflow-auto rounded bg-ink p-4 text-xs text-white">{JSON.stringify(tasks, null, 2)}</pre>
    </section>
  );
}
