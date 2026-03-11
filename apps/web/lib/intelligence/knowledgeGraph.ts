export type GraphNodeType = "user" | "profile" | "content" | "module" | "event";

export type GraphNode = {
  id: string;
  type: GraphNodeType;
  label: string;
  attrs?: Record<string, unknown>;
};

export type GraphEdge = {
  from: string;
  to: string;
  relation: string;
  weight?: number;
};

export type KnowledgeGraphProjection = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export function buildMinimalKnowledgeGraph(input: {
  userId?: string | null;
  profileId?: string | null;
  module?: string;
  contentId?: string;
}): KnowledgeGraphProjection {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  if (input.userId) {
    nodes.push({ id: `user:${input.userId}`, type: "user", label: "User" });
  }
  if (input.profileId) {
    nodes.push({ id: `profile:${input.profileId}`, type: "profile", label: "Profile" });
    if (input.userId) {
      edges.push({ from: `user:${input.userId}`, to: `profile:${input.profileId}`, relation: "owns" });
    }
  }
  if (input.module) {
    nodes.push({ id: `module:${input.module}`, type: "module", label: input.module });
    if (input.userId) {
      edges.push({ from: `user:${input.userId}`, to: `module:${input.module}`, relation: "engaged_with" });
    }
  }
  if (input.contentId) {
    nodes.push({ id: `content:${input.contentId}`, type: "content", label: "Content" });
    if (input.module) {
      edges.push({ from: `module:${input.module}`, to: `content:${input.contentId}`, relation: "contains" });
    }
  }

  return { nodes, edges };
}
