import { describe, expect, it } from "vitest";
import { evaluateContextualModerationEscalation } from "@/lib/contextualModerationEscalation";

describe("contextual moderation escalation", () => {
  it("escalates when context chain amplifies severity", async () => {
    const result = await evaluateContextualModerationEscalation({
      eventId: "evt-146",
      baseSeverity: 0.45,
      contextSignals: ["repeat_offense", "cross_surface_pattern"]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.decision).toBe("escalate");
  });

  it("hard blocks when severity exceeds hard block threshold", async () => {
    const result = await evaluateContextualModerationEscalation({
      eventId: "evt-146-hard",
      baseSeverity: 0.8,
      contextSignals: ["targeted_harassment"]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.decision).toBe("hard_block");
  });
});
