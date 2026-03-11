import { describe, expect, it } from "vitest";
import { listExperienceActions, upsertExperienceAction } from "@/lib/humanLoopExperienceConsole";

describe("human-in-the-loop experience console", () => {
  it("stores high-impact proposed actions for review", async () => {
    const result = await upsertExperienceAction({
      actionId: "act-150-proposed",
      actionType: "ranking_override",
      status: "proposed"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.requiresHumanApproval).toBe(true);
  });

  it("allows operator override updates", async () => {
    await upsertExperienceAction({
      actionId: "act-150-proposed",
      actionType: "ranking_override",
      status: "proposed"
    });

    const result = await upsertExperienceAction({
      actionId: "act-150-proposed",
      actionType: "ranking_override",
      status: "overridden",
      operator: "ops-admin",
      reason: "manual rollback"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const actions = await listExperienceActions();
    const action = actions.actions.find((entry) => (entry as { actionId?: string }).actionId === "act-150-proposed");
    expect(action).toBeTruthy();
  });
});
