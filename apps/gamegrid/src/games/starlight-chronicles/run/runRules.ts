import { hashStringToSeed } from '../rng';
import { applyOutcome, type OutcomeDelta, type StarlightProfile } from '../rules';
import type { RunNodeResult, RunState, StarMapGraph } from './runTypes';

function emptyFactionDelta() {
  return { concordium: 0, freebelt: 0, astral: 0 };
}

export function createRunState(runSeed: number, difficulty: RunState['difficulty'], focus: RunState['focus']): RunState {
  return {
    id: `run-${runSeed}`,
    runSeed,
    difficulty,
    focus,
    currentStep: 0,
    currentNodeId: null,
    completedNodeIds: [],
    pendingNodeIds: [],
    summary: {
      nodesCompleted: 0,
      totalCredits: 0,
      totalMaterials: 0,
      totalXp: 0,
      factionDelta: emptyFactionDelta(),
      notes: []
    },
    finished: false
  };
}

export function selectableNodeIds(runState: RunState, graph: StarMapGraph): string[] {
  if (runState.currentStep === 0 && runState.completedNodeIds.length === 0) {
    return graph.nodes.filter((node) => node.step === 0).map((node) => node.id);
  }

  if (!runState.currentNodeId) return [];
  return graph.edges[runState.currentNodeId] ?? [];
}

export function startNode(runState: RunState, nodeId: string): RunState {
  return {
    ...runState,
    currentNodeId: nodeId
  };
}

export function completeNode(runState: RunState, nodeId: string, result: RunNodeResult, graph: StarMapGraph): RunState {
  const node = graph.nodes.find((entry) => entry.id === nodeId);
  if (!node) return runState;

  const isFinished = node.type === 'BOSS';
  const completed = runState.completedNodeIds.includes(nodeId) ? runState.completedNodeIds : [...runState.completedNodeIds, nodeId];
  const nextStep = node.step + 1;

  return {
    ...runState,
    currentNodeId: isFinished ? null : nodeId,
    currentStep: nextStep,
    completedNodeIds: completed,
    pendingNodeIds: selectableNodeIds({ ...runState, currentNodeId: nodeId, currentStep: nextStep, completedNodeIds: completed }, graph),
    summary: {
      nodesCompleted: runState.summary.nodesCompleted + 1,
      totalCredits: runState.summary.totalCredits + result.credits,
      totalMaterials: runState.summary.totalMaterials + result.materials,
      totalXp: runState.summary.totalXp + result.xp,
      factionDelta: {
        concordium: runState.summary.factionDelta.concordium + result.factionDelta.concordium,
        freebelt: runState.summary.factionDelta.freebelt + result.factionDelta.freebelt,
        astral: runState.summary.factionDelta.astral + result.factionDelta.astral
      },
      notes: [...runState.summary.notes, ...result.notes]
    },
    finished: isFinished
  };
}

export function applyRunNodeOutcome(profile: StarlightProfile, outcome: OutcomeDelta): StarlightProfile {
  return applyOutcome(profile, outcome);
}

export function deterministicNodeSeed(runSeed: number, nodeId: string): number {
  return (runSeed ^ hashStringToSeed(nodeId)) >>> 0;
}

export function deterministicNodeEventSeed(runSeed: number, nodeId: string, eventIndex: number): number {
  return (runSeed ^ hashStringToSeed(`${nodeId}:${eventIndex}`)) >>> 0;
}
