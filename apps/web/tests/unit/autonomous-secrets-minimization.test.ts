import { describe, expect, it } from "vitest";
import { evaluateSecretsMinimization } from "@/lib/autonomousSecretsMinimization";

describe("autonomous secrets minimization", () => {
  it("flags over-scoped or over-ttl secret requests", async () => {
    const result = await evaluateSecretsMinimization({
      taskId: "task-137",
      secrets: [
        { name: "DB_PASSWORD", scope: "read:storage", ttlMinutes: 30 },
        { name: "ROOT_TOKEN", scope: "admin:*", ttlMinutes: 180 }
      ]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.violations.length).toBeGreaterThan(0);
  });
});
