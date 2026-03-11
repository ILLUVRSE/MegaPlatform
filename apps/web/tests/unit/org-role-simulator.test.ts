import { describe, expect, it } from "vitest";
import { runOrgRoleSimulation } from "@/lib/orgRoleSimulator";

describe("org role simulator", () => {
  it("produces coherent role outputs for core functional teams", async () => {
    const result = await runOrgRoleSimulation({
      scenario: "watch engagement dropped 12% week-over-week",
      urgency: "high",
      modules: ["watch", "feed"]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const roleIds = result.outputs.map((item) => item.role);
    expect(roleIds).toContain("ops");
    expect(roleIds).toContain("product");
    expect(roleIds).toContain("safety");
    expect(roleIds).toContain("growth");
    expect(result.outputs.every((item) => item.tasks.length > 0)).toBe(true);
  });
});
