import { describe, expect, it } from "vitest";
import { ingestRegulatoryChange } from "@/lib/regulatoryChangeIngestionLoop";

describe("regulatory change ingestion loop", () => {
  it("records policy deltas for regulatory updates", async () => {
    const result = await ingestRegulatoryChange({ regulation: "DMA", changeSummary: "new transparency rule", controlMapping: ["audit_log"] });
    expect(result.ok).toBe(true);
  });
});
