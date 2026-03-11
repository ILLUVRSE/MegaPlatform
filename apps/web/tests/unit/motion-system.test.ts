import { describe, expect, it } from "vitest";
import { MOTION_CLASS } from "@/lib/ui/motion";

describe("motion system", () => {
  it("defines reduced-motion-safe primitives", () => {
    expect(MOTION_CLASS.enterFadeUp).toContain("motion-reduce:animate-none");
    expect(MOTION_CLASS.hoverLift).toContain("hover:-translate-y-0.5");
    expect(MOTION_CLASS.pressScale).toContain("active:scale-[0.98]");
  });
});
