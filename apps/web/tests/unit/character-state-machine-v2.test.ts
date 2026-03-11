import { describe, expect, it } from "vitest";
import { evaluateCharacterStateMachineV2 } from "@/lib/characterStateMachineV2";

describe("character state machine v2", () => {
  it("blocks invalid transitions and shares transition contract", async () => {
    const result = await evaluateCharacterStateMachineV2({ fromState: "run", toState: "interact" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.validTransition).toBe(false);
    expect(result.invalidTransitionBlocked).toBe(true);
  });
});
