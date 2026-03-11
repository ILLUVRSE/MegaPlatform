import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, readdir } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import {
  createTask,
  claimTask,
  completeTask,
  blockTask,
  readTask,
  listTasks,
  type OpsAgent
} from "@illuvrse/agent-manager";

describe("docs task queue operations", () => {
  let root = "";
  let queueRoot = "";

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "illuvrse-queue-test-"));
    queueRoot = path.join(root, "docs", "queue");
  });

  afterEach(async () => {
    if (root) {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("creates, claims, completes, and blocks tasks", async () => {
    const base = {
      title: "Stabilize flaky suite",
      agent: "Quality/Analytics" as OpsAgent,
      priority: 1,
      context: "Failing tests on shipcheck quick",
      acceptance_criteria: ["Capture failing stages"],
      steps_log: [],
      artifacts: [],
      risk_level: "medium" as const,
      rollback_notes: "Revert temporary patches"
    };

    const task = await createTask(base, queueRoot);
    expect(task.status).toBe("pending");

    const pendingFiles = await readdir(path.join(queueRoot, "pending"));
    expect(pendingFiles.some((name) => name.includes(task.id))).toBe(true);

    const claimed = await claimTask(task.id, "Quality/Analytics", queueRoot);
    expect(claimed.status).toBe("in_progress");
    expect(claimed.claimed_by).toBe("Quality/Analytics");

    const done = await completeTask(task.id, "Triaged and resolved", ["docs/logs/triage.md"], queueRoot);
    expect(done.status).toBe("done");
    expect(done.artifacts).toContain("docs/logs/triage.md");

    const second = await createTask(
      {
        ...base,
        title: "Investigate queue deadlock",
        agent: "Ops/SRE"
      },
      queueRoot
    );
    const blocked = await blockTask(second.id, "Redis unavailable", queueRoot);
    expect(blocked.status).toBe("blocked");

    const all = await listTasks(queueRoot);
    expect(all).toHaveLength(2);
    expect(all.map((entry) => entry.status).sort()).toEqual(["blocked", "done"]);
  });

  it("persists markdown tasks and reads them back", async () => {
    const created = await createTask(
      {
        title: "Runbook refresh",
        agent: "Ops/SRE",
        priority: 2,
        context: "Update stale sections",
        acceptance_criteria: ["Document stale entries"],
        steps_log: ["seed step"],
        artifacts: [],
        risk_level: "low",
        rollback_notes: "Restore previous runbook revision"
      },
      queueRoot
    );

    const loaded = await readTask(created.id, queueRoot);
    expect(loaded).not.toBeNull();
    expect(loaded?.title).toBe("Runbook refresh");
    expect(loaded?.acceptance_criteria).toEqual(["Document stale entries"]);
  });
});
