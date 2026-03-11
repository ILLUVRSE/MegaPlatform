import { describe, expect, it } from "vitest";
import { validateCoCreationWorkflow } from "@/lib/communityCoCreation";

describe("community co-creation protocols", () => {
  it("validates mixed user/agent workflows with provenance", async () => {
    const result = await validateCoCreationWorkflow({
      workflowId: "cc-115",
      moderationState: "pending",
      contributions: [
        { contributorType: "user", contributorId: "u1", contentRef: "asset-a", provenanceRef: "prov-1" },
        { contributorType: "agent", contributorId: "a1", contentRef: "asset-b", provenanceRef: "prov-2" }
      ]
    });

    expect(result.ok).toBe(true);
  });
});
