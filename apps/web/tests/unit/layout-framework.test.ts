import { describe, expect, it } from "vitest";
import { LAYOUT_CLASS } from "@/lib/ui/layout";

describe("layout framework", () => {
  it("defines shared responsive primitives", () => {
    expect(LAYOUT_CLASS.frame).toContain("max-w-[1200px]");
    expect(LAYOUT_CLASS.stackPage).toContain("lg:space-y-10");
    expect(LAYOUT_CLASS.gridCards).toContain("sm:gap-5");
  });
});
