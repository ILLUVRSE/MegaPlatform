import { describe, expect, it } from "vitest";
import { INPUT_LOCK_KEYS, shouldPreventGameplayKey } from "@/lib/minigame/inputLock";

describe("minigame input lock", () => {
  it("includes arrow keys and space", () => {
    expect(INPUT_LOCK_KEYS).toContain("ArrowUp");
    expect(INPUT_LOCK_KEYS).toContain("ArrowDown");
    expect(INPUT_LOCK_KEYS).toContain("ArrowLeft");
    expect(INPUT_LOCK_KEYS).toContain("ArrowRight");
    expect(INPUT_LOCK_KEYS).toContain("Space");
  });

  it("prevents default only when focused and playing", () => {
    expect(shouldPreventGameplayKey("Space", false, true)).toBe(false);
    expect(shouldPreventGameplayKey("Space", true, false)).toBe(false);
    expect(shouldPreventGameplayKey("Space", true, true)).toBe(true);
    expect(shouldPreventGameplayKey("KeyZ", true, true)).toBe(false);
  });
});
