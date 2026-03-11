import { describe, expect, it } from "vitest";
import { queryEvidenceGraph, upsertEvidenceGraph } from "@/lib/evidenceGraphForAudits";

describe("evidence graph for audits", () => {
  it("supports control-to-evidence traversal", async () => {
    await upsertEvidenceGraph({ nodes: [{ id: "c-1", kind: "control" }, { id: "e-1", kind: "evidence" }], edges: [{ from: "c-1", to: "e-1", relation: "proves" }] });
    const result = await queryEvidenceGraph({ sourceId: "c-1" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.edges.length).toBeGreaterThan(0);
  });
});
