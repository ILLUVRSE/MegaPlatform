import path from "path";
import { describe, expect, it } from "vitest";
import { evaluatePlatformRuntimeReadiness } from "@/lib/platformRuntimeReadiness";

describe("platform runtime readiness", () => {
  it("passes when the required phase 301-310 assets exist", () => {
    const result = evaluatePlatformRuntimeReadiness(path.resolve(process.cwd(), "..", ".."));

    expect(result.ok).toBe(true);
    expect(result.missingDocs).toEqual([]);
    expect(result.missingRuntimeFiles).toEqual([]);
  });
});
