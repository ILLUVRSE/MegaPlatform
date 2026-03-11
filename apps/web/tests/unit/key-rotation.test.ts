import { describe, expect, it } from "vitest";
import { buildKeyRotationStatus } from "@/lib/keyRotation";

describe("key rotation status", () => {
  it("detects overdue key rotation entries", async () => {
    const status = await buildKeyRotationStatus(new Date("2026-06-01T00:00:00.000Z"));
    expect(status.entries.length).toBeGreaterThan(0);
    expect(status.overdue.length).toBeGreaterThan(0);
  });
});
