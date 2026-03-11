import { describe, expect, it } from "vitest";
import { evaluateCreatorActionPermission, upsertCreatorAutonomyContract } from "@/lib/creatorAutonomyContracts";

describe("creator autonomy contracts", () => {
  it("enforces creator-specific allowed actions", async () => {
    await upsertCreatorAutonomyContract({
      creatorId: "creator-151",
      allowedActions: ["publish", "schedule"],
      deniedActions: ["schedule"],
      status: "active"
    });

    const allowed = await evaluateCreatorActionPermission("creator-151", "publish");
    const denied = await evaluateCreatorActionPermission("creator-151", "schedule");

    expect(allowed.allowed).toBe(true);
    expect(denied.allowed).toBe(false);
  });

  it("blocks restricted actions at contract definition time", async () => {
    const result = await upsertCreatorAutonomyContract({
      creatorId: "creator-151-bad",
      allowedActions: ["rights_override"],
      deniedActions: [],
      status: "active"
    });

    expect(result.ok).toBe(false);
  });
});
