import { describe, expect, it } from "vitest";
import { buildPermissionDriftReport } from "@/lib/permissionDrift";

describe("permission drift report", () => {
  it("detects permission additions outside baseline", async () => {
    const prisma = {
      role: {
        findMany: async () => [
          { name: "admin", permissions: ["admin:*"] },
          { name: "moderator", permissions: ["feed:review", "admin:*"] }
        ]
      }
    };

    const report = await buildPermissionDriftReport(prisma);
    expect(report.drift.length).toBeGreaterThan(0);
    expect(report.drift.some((row) => row.role === "moderator")).toBe(true);
  });
});
