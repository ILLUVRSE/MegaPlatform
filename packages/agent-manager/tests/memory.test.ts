import test from "node:test";
import assert from "node:assert/strict";
import os from "os";
import path from "path";
import { promises as fs } from "fs";
import { appendAgentMemory, getAgentDailyUsage, listAgentMemory } from "../src/ops/memory";
import { replayAgentInteractions, replayAgentRun } from "../src/ops/replay";
import { assertAgentBudget } from "../src/ops/controlPlane";

async function makeRepoRoot() {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-memory-"));
  await fs.mkdir(path.join(repoRoot, "ops", "governance"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, "ops", "governance", "agent-budgets.json"),
    JSON.stringify([{ agent: "Director", window: "daily", maxActions: 3, maxTokenBudget: 1000 }], null, 2),
    "utf-8"
  );
  return repoRoot;
}

test("persists agent memory by namespace and evicts expired entries", async () => {
  const repoRoot = await makeRepoRoot();
  const actor = "Director";
  const day = new Date("2026-03-13T08:00:00.000Z");

  await appendAgentMemory(
    repoRoot,
    actor,
    {
      runId: "run-1",
      actor,
      ok: true,
      action: "sense",
      summary: "expired",
      tokenUsage: 10
    },
    { namespace: "planning", ttlMs: 1, now: day }
  );

  await appendAgentMemory(
    repoRoot,
    actor,
    {
      runId: "run-2",
      actor,
      ok: true,
      action: "act",
      summary: "retained",
      tokenUsage: 20
    },
    { namespace: "planning", ttlMs: 60_000, now: new Date(day.getTime() + 1000), maxEntries: 2 }
  );

  await appendAgentMemory(
    repoRoot,
    actor,
    {
      runId: "run-3",
      actor,
      ok: true,
      action: "handoff",
      summary: "other namespace",
      tokenUsage: 30
    },
    { namespace: "handoff", ttlMs: 60_000, now: new Date(day.getTime() + 2000) }
  );

  const planning = await listAgentMemory(repoRoot, actor, {
    namespace: "planning",
    now: new Date(day.getTime() + 3000)
  });
  assert.equal(planning.length, 1);
  assert.equal(planning[0]?.summary, "retained");
  assert.equal(planning[0]?.namespace, "planning");

  const files = await fs.readdir(path.join(repoRoot, "docs", "ops_brain", "memory", "director"));
  assert.deepEqual(files.sort(), ["handoff.jsonl", "planning.jsonl"]);
});

test("replays last interactions with deterministic ordering", async () => {
  const repoRoot = await makeRepoRoot();
  const actor = "Director";

  await appendAgentMemory(
    repoRoot,
    actor,
    { runId: "run-a", actor, ok: true, action: "sense", summary: "first", tokenUsage: 5 },
    { namespace: "interactions", now: new Date("2026-03-13T09:00:00.000Z") }
  );
  await appendAgentMemory(
    repoRoot,
    actor,
    { runId: "run-a", actor, ok: true, action: "think", summary: "second", tokenUsage: 5 },
    { namespace: "interactions", now: new Date("2026-03-13T09:00:00.000Z") }
  );
  await appendAgentMemory(
    repoRoot,
    actor,
    { runId: "run-b", actor, ok: true, action: "act", summary: "third", tokenUsage: 5 },
    { namespace: "interactions", now: new Date("2026-03-13T09:00:01.000Z") }
  );

  const runReplay = await replayAgentRun(repoRoot, actor, "run-a");
  assert.deepEqual(
    runReplay.steps.map((step) => `${step.sequence}:${step.summary}`),
    ["1:first", "2:second"]
  );

  const interactionReplay = await replayAgentInteractions(repoRoot, actor, { last: 2 });
  assert.deepEqual(
    interactionReplay.steps.map((step) => step.summary),
    ["second", "third"]
  );
});

test("enforces token cost controls with warnings and soft-fail alerts", async () => {
  const repoRoot = await makeRepoRoot();
  const actor = "Director";
  const now = new Date("2026-03-13T10:00:00.000Z");

  await appendAgentMemory(
    repoRoot,
    actor,
    { runId: "usage-1", actor, ok: true, action: "run_cycle", summary: "baseline", tokenUsage: 750 },
    { now }
  );

  const warning = await assertAgentBudget(repoRoot, actor, { actionsToday: 1, estimatedTokens: 100 });
  assert.equal(warning.ok, true);
  assert.equal(warning.softFail, false);
  assert.match(warning.alerts[0] ?? "", /warning/i);

  const softFail = await assertAgentBudget(repoRoot, actor, { actionsToday: 1, estimatedTokens: 300 });
  assert.equal(softFail.ok, false);
  assert.equal(softFail.softFail, true);
  assert.match(softFail.alerts[0] ?? "", /reached/i);

  const usage = await getAgentDailyUsage(repoRoot, actor, "2026-03-13");
  assert.equal(usage.tokens, 750);

  const alerts = await fs.readFile(path.join(repoRoot, "docs", "ops_brain", "alerts", "agent-cost-controls.jsonl"), "utf-8");
  assert.match(alerts, /warning/);
  assert.match(alerts, /soft_fail/);
});
