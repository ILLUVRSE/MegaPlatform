import { describe, expect, it } from "vitest";
import { runEcosystemAntifragilityLoop } from "@/lib/ecosystemAntifragilityLoop";

describe("ecosystem antifragility loop", () => {
  it("turns incidents into validated resilience upgrades", async () => {
    const result = await runEcosystemAntifragilityLoop({ incidents: [{ id: "i1", severity: 0.8, lesson: "add retry circuit", validated: true }] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.upgrades.length).toBe(1);
  });
});
