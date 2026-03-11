export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { findOpsRoot, parseBriefing, readBriefing, readLogs, readTasks } from "@/lib/ops";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const opsRoot = await findOpsRoot();
  if (!opsRoot) {
    return NextResponse.json({ error: "ops root not found" }, { status: 404 });
  }

  const tasks = await readTasks(opsRoot);
  const logs = await readLogs(opsRoot);
  const briefing = await readBriefing(opsRoot);
  const sections = parseBriefing(briefing);
  const destructiveOk = briefing.includes("[DESTRUCTIVE-OK]");
  const notesRaw = briefing.split("# Notes")[1]?.trim() ?? "";
  const notes = notesRaw
    .split("\n")
    .filter((line) => !line.includes("[DESTRUCTIVE-OK]"))
    .join("\n")
    .trim();

  const now = Date.now();
  const summary = {
    pending: tasks.filter((task) => task.status === "pending").length,
    inProgress: tasks.filter((task) => task.status === "in_progress").length,
    done: tasks.filter((task) => task.status === "done").length,
    blocked: tasks.filter((task) => task.status === "blocked").length,
    stalePending: tasks.filter(
      (task) => task.status === "pending" && now - task.createdAtTs > 2 * 60 * 60 * 1000
    ).length,
    staleInProgress: tasks.filter(
      (task) => task.status === "in_progress" && now - task.createdAtTs > 6 * 60 * 60 * 1000
    ).length
  };

  return NextResponse.json({
    ok: true,
    tasks,
    logs,
    sections,
    notes,
    destructiveOk,
    summary,
    generatedAt: new Date().toISOString()
  });
}
