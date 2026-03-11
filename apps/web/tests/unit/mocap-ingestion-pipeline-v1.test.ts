import { describe, expect, it } from "vitest";
import { evaluateMocapIngestionPipelineV1 } from "@/lib/mocapIngestionPipelineV1";

describe("mocap ingestion pipeline v1", () => {
  it("validates, transforms, and stores deterministic outputs", async () => {
    const result = await evaluateMocapIngestionPipelineV1({
      sourceFormat: "fbx",
      sampleCount: 12000,
      transformProfile: "humanoid"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ingestionValid).toBe(true);
    expect(result.transformed).toBe(true);
    expect(result.stored).toBe(true);
    expect(result.deterministicOutputId).toBe("fbx:12000:humanoid");
  });
});
