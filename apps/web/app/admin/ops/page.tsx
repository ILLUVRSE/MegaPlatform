/**
 * Admin ops page (local-only task queue and logs).
 * Guard: requireAdmin (RBAC).
 */
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/rbac";
import OpsDashboard from "./OpsDashboard";
import { findOpsRoot, parseBriefing, readBriefing, readLogs, readTasks } from "@/lib/ops";

export default async function AdminOpsPage() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    redirect("/auth/signin");
  }

  const opsRoot = await findOpsRoot();
  if (!opsRoot) {
    return (
      <div className="rounded-2xl border border-illuvrse-border bg-white p-6 text-sm text-illuvrse-muted">
        Ops folder not found. Ensure `ops/` exists at the repo root.
      </div>
    );
  }

  const tasks = await readTasks(opsRoot);
  const logs = await readLogs(opsRoot);
  const briefingContent = await readBriefing(opsRoot);
  const sections = parseBriefing(briefingContent);
  const destructiveOk = briefingContent.includes("[DESTRUCTIVE-OK]");
  const notesRaw = briefingContent.split("# Notes")[1]?.trim() ?? "";
  const notes = notesRaw
    .split("\n")
    .filter((line) => !line.includes("[DESTRUCTIVE-OK]"))
    .join("\n")
    .trim();

  return (
    <OpsDashboard
      initialTasks={tasks}
      initialLogs={logs}
      initialSections={sections}
      initialNotes={notes}
      initialDestructiveOk={destructiveOk}
    />
  );
}
