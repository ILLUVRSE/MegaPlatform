export type NodeType = 'STORY' | 'EXPLORE' | 'COMBAT' | 'SHOP' | 'DELIVERY' | 'ESCORT' | 'PATROL' | 'BOSS';
export type RunDifficulty = 'easy' | 'normal' | 'hard';
export type RunFocus = 'diplomacy' | 'profit' | 'wonder';

export interface StarMapNode {
  id: string;
  step: number;
  lane: 0 | 1 | 2;
  type: NodeType;
  difficulty: number;
  rewardHints: string[];
  factionInfluenceHint: 'concordium' | 'freebelt' | 'astral' | 'mixed';
}

export interface StarMapGraph {
  runSeed: number;
  stepCount: number;
  nodes: StarMapNode[];
  edges: Record<string, string[]>;
}

export interface RunNodeResult {
  credits: number;
  materials: number;
  morale: number;
  condition: number;
  xp: number;
  factionDelta: {
    concordium: number;
    freebelt: number;
    astral: number;
  };
  notes: string[];
}

export interface RunState {
  id: string;
  runSeed: number;
  difficulty: RunDifficulty;
  focus: RunFocus;
  currentStep: number;
  currentNodeId: string | null;
  completedNodeIds: string[];
  pendingNodeIds: string[];
  summary: {
    nodesCompleted: number;
    totalCredits: number;
    totalMaterials: number;
    totalXp: number;
    factionDelta: {
      concordium: number;
      freebelt: number;
      astral: number;
    };
    notes: string[];
  };
  finished: boolean;
}
