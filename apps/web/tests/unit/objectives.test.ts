import { describe, expect, it } from "vitest";
import { loadObjectives } from "@/lib/objectives";

describe("objective registry", () => {
  it("loads versioned objective entries", async () => {
    const objectives = await loadObjectives();
    expect(objectives.length).toBeGreaterThan(0);
    expect(objectives[0]).toHaveProperty("id");
    expect(objectives[0]).toHaveProperty("owner");
  });
});
