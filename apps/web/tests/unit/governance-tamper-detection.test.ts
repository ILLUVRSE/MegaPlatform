import { describe, expect, it } from "vitest";
import { runGovernanceTamperScan } from "@/lib/governanceTamperDetection";

describe("governance tamper detection", () => {
  it("returns integrity scan output with tamper indicators", async () => {
    const result = await runGovernanceTamperScan();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(typeof result.tamperDetected).toBe("boolean");
    expect(result.monitoredFileCount).toBeGreaterThan(0);
  });
});
