/**
 * Studio ops page.
 * Request/response: renders ops filters and job table.
 * Guard: admin-only if role present in session.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OpsJobs from "./components/OpsJobs";
import OpsTaskBoard from "./components/OpsTaskBoard";
import { listTasks } from "@illuvrse/agent-manager";
import path from "path";

export default async function StudioOpsPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? null;

  if (role && role !== "admin") {
    return (
      <div className="party-card space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Studio Ops</p>
        <h1 className="text-2xl font-semibold">Admin access required</h1>
        <p className="text-sm text-illuvrse-muted">TODO: enforce RBAC once admin roles are wired.</p>
      </div>
    );
  }

  const queueRoot = path.join(process.cwd(), "..", "..", "..", "docs", "queue");
  const tasks = await listTasks(queueRoot).catch(() => []);

  return (
    <div className="space-y-6">
      <header className="party-card">
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Studio Ops</p>
        <h1 className="text-3xl font-semibold">Failure visibility & retries</h1>
        <p className="text-sm text-illuvrse-muted">Inspect failed jobs, retry runs, and triage issues.</p>
      </header>
      <OpsJobs />
      <OpsTaskBoard tasks={tasks} />
    </div>
  );
}
