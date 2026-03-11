import { describe, expect, it } from "vitest";
import {
  canTransition,
  getAllowedTransitions,
  resolveRequestPublishState,
  assertValidTransition
} from "@/lib/contentLifecycle";

describe("content lifecycle", () => {
  it("enforces valid transitions", () => {
    expect(canTransition("DRAFT", "REVIEW")).toBe(true);
    expect(canTransition("REVIEW", "PUBLISHED")).toBe(true);
    expect(canTransition("PUBLISHED", "REVIEW")).toBe(false);
    expect(getAllowedTransitions("REJECTED")).toEqual(["DRAFT", "ARCHIVED"]);
  });

  it("resolves request publish target state", () => {
    expect(resolveRequestPublishState("SHORT", false)).toBe("PROCESSING");
    expect(resolveRequestPublishState("SHORT", true)).toBe("REVIEW");
    expect(resolveRequestPublishState("MEME", false)).toBe("REVIEW");
  });

  it("throws on invalid transition assertion", () => {
    expect(() => assertValidTransition("REVIEW", "DRAFT")).toThrow(/Invalid content state transition/);
    expect(() => assertValidTransition("REVIEW", "PUBLISHED")).not.toThrow();
  });
});
