import { describe, expect, it } from "vitest";
import { TYPOGRAPHY_CLASS } from "@/lib/ui/typography";

describe("typography utility", () => {
  it("defines shared text classes for shell surfaces", () => {
    expect(TYPOGRAPHY_CLASS.eyebrow).toContain("uppercase");
    expect(TYPOGRAPHY_CLASS.titleSection).toContain("font-display");
    expect(TYPOGRAPHY_CLASS.body).toContain("text-illuvrse-muted");
  });
});
