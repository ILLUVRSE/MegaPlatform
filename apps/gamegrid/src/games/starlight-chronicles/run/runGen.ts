import { createSeededRng } from '../rng';
import type { RunFocus, StarMapGraph, StarMapNode, NodeType } from './runTypes';

interface StarMapGenerationOptions {
  includeDeliveryNode?: boolean;
  includeEscortNode?: boolean;
  includePatrolNode?: boolean;
}

function laneId(step: number, lane: 0 | 1 | 2): string {
  return `n-${step}-${lane}`;
}

function hintByType(type: NodeType): string[] {
  if (type === 'STORY') return ['Choice', 'Faction Shift'];
  if (type === 'EXPLORE') return ['Scan', 'Anomaly'];
  if (type === 'COMBAT') return ['Loot', 'XP'];
  if (type === 'DELIVERY') return ['Cargo', 'Contract'];
  if (type === 'ESCORT') return ['Convoy', 'Faction Gain'];
  if (type === 'PATROL') return ['Standing', 'Risk Shift'];
  if (type === 'SHOP') return ['Repair', 'Buy/Sell'];
  return ['Boss', 'Major Reward'];
}

function factionHint(type: NodeType, focus: RunFocus): StarMapNode['factionInfluenceHint'] {
  if (focus === 'diplomacy') return type === 'SHOP' || type === 'DELIVERY' ? 'mixed' : 'concordium';
  if (focus === 'profit') return type === 'STORY' ? 'mixed' : 'freebelt';
  if (focus === 'wonder') return type === 'SHOP' || type === 'DELIVERY' ? 'mixed' : 'astral';
  return 'mixed';
}

const NON_BOSS_TYPES: NodeType[] = ['STORY', 'EXPLORE', 'COMBAT', 'SHOP', 'ESCORT', 'PATROL'];

function safeInt(nextInt: (min: number, max: number) => number, min: number, max: number): number {
  return Math.max(min, Math.min(max, nextInt(min, max)));
}

export function generateStarMap(runSeed: number, focus: RunFocus, options: StarMapGenerationOptions = {}): StarMapGraph {
  const rng = createSeededRng(runSeed);
  const stepCount = 3 + safeInt(rng.nextInt, 0, 3);
  const nodes: StarMapNode[] = [];
  const edges: Record<string, string[]> = {};

  const mustHave: NodeType[] = ['STORY', 'EXPLORE', 'COMBAT'];
  const pooledTypes: NodeType[] = [];
  for (let step = 0; step < stepCount - 1; step += 1) {
    for (let lane = 0; lane < 3; lane += 1) {
      if (mustHave.length > 0) {
        pooledTypes.push(mustHave.shift() as NodeType);
      } else {
        const weighted =
          focus === 'diplomacy'
            ? ['STORY', 'STORY', 'EXPLORE', 'COMBAT', 'SHOP']
            : focus === 'profit'
              ? ['SHOP', 'SHOP', 'COMBAT', 'EXPLORE', 'STORY']
              : ['EXPLORE', 'EXPLORE', 'STORY', 'COMBAT', 'SHOP'];
        pooledTypes.push(weighted[safeInt(rng.nextInt, 0, weighted.length - 1)] as NodeType);
      }
    }
  }

  let poolCursor = 0;
  for (let step = 0; step < stepCount; step += 1) {
    for (let lane = 0; lane < 3; lane += 1) {
      const typedLane = lane as 0 | 1 | 2;
      const type: NodeType = step === stepCount - 1 ? 'BOSS' : pooledTypes[poolCursor++] ?? NON_BOSS_TYPES[safeInt(rng.nextInt, 0, NON_BOSS_TYPES.length - 1)];
      nodes.push({
        id: laneId(step, typedLane),
        step,
        lane: typedLane,
        type,
        difficulty: step + 1,
        rewardHints: hintByType(type),
        factionInfluenceHint: factionHint(type, focus)
      });
    }
  }

  if (options.includeDeliveryNode) {
    const target = nodes.find((entry) => entry.step < stepCount - 1 && entry.type === 'SHOP') ?? nodes.find((entry) => entry.step < stepCount - 1 && entry.type !== 'BOSS');
    if (target) {
      target.type = 'DELIVERY';
      target.rewardHints = hintByType('DELIVERY');
      target.factionInfluenceHint = 'mixed';
    }
  }

  if (options.includeEscortNode) {
    const target =
      nodes.find((entry) => entry.step < stepCount - 1 && entry.type === 'SHOP') ??
      nodes.find((entry) => entry.step < stepCount - 1 && entry.type === 'EXPLORE') ??
      nodes.find((entry) => entry.step < stepCount - 1 && entry.type !== 'BOSS' && entry.type !== 'PATROL');
    if (target) {
      target.type = 'ESCORT';
      target.rewardHints = hintByType('ESCORT');
      target.factionInfluenceHint = 'mixed';
    }
  }

  if (options.includePatrolNode) {
    const target =
      nodes.find((entry) => entry.step < stepCount - 1 && entry.type === 'STORY') ??
      nodes.find((entry) => entry.step < stepCount - 1 && entry.type !== 'BOSS' && entry.type !== 'ESCORT');
    if (target) {
      target.type = 'PATROL';
      target.rewardHints = hintByType('PATROL');
      target.factionInfluenceHint = 'mixed';
    }
  }

  for (let step = 0; step < stepCount - 1; step += 1) {
    for (let lane = 0; lane < 3; lane += 1) {
      const fromId = laneId(step, lane as 0 | 1 | 2);
      const next: string[] = [];
      for (let toLane = 0; toLane < 3; toLane += 1) {
        if (Math.abs(toLane - lane) <= 1) {
          next.push(laneId(step + 1, toLane as 0 | 1 | 2));
        }
      }
      edges[fromId] = next;
    }
  }

  return {
    runSeed,
    stepCount,
    nodes,
    edges
  };
}

export function entryNodes(graph: StarMapGraph): StarMapNode[] {
  return graph.nodes.filter((node) => node.step === 0);
}
