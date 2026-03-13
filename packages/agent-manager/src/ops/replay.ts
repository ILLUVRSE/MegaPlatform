import { listAgentMemory } from "./memory";

export type ReplayAgentRunOptions = {
  last?: number;
  namespace?: string;
  namespaces?: string[];
};

export async function replayAgentRun(repoRoot: string, actor: string, runId: string, options: ReplayAgentRunOptions = {}) {
  const rows = await listAgentMemory(repoRoot, actor, {
    runId,
    namespace: options.namespace,
    namespaces: options.namespaces,
    last: options.last
  });

  return {
    actor,
    runId,
    steps: rows
  };
}

export async function replayAgentInteractions(repoRoot: string, actor: string, options: ReplayAgentRunOptions = {}) {
  const steps = await listAgentMemory(repoRoot, actor, {
    namespace: options.namespace,
    namespaces: options.namespaces,
    last: options.last
  });

  return {
    actor,
    last: options.last ?? steps.length,
    steps
  };
}
