import { describe, expect, it } from "vitest";
import { appendAttributionEdge, queryAttributionEdges } from "@/lib/attributionGraphV2";

describe("attribution graph v2", () => {
  it("stores and queries contribution edges", async () => {
    const writeResult = await appendAttributionEdge({
      edgeId: "edge-154",
      subjectId: "asset-154",
      objectId: "creator-154",
      edgeType: "authored",
      actorKind: "human",
      evidenceRef: "evidence-154"
    });

    expect(writeResult.ok).toBe(true);
    if (!writeResult.ok) return;

    const edges = await queryAttributionEdges("asset-154");
    expect(edges.length).toBeGreaterThan(0);
  });
});
