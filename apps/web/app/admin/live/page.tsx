import Link from "next/link";

export default function AdminLivePage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card">
        <h2 className="text-xl font-semibold">Live TV Management</h2>
        <p className="text-sm text-illuvrse-muted">
          Manage channels, EPG schedules, health checks, and scheduler operations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/admin/live/channels" className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card">
          <h3 className="font-semibold">Live Channels + EPG</h3>
          <p className="mt-1 text-sm text-illuvrse-muted">
            CRUD channels, manage programs, run generate/clear/lock tools.
          </p>
        </Link>
        <Link href="/admin/live/scheduler" className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card">
          <h3 className="font-semibold">Scheduler Controls</h3>
          <p className="mt-1 text-sm text-illuvrse-muted">
            Run scheduler now and inspect run summaries and errors.
          </p>
        </Link>
      </div>
    </div>
  );
}
