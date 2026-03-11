import { describe, expect, it } from "vitest";
import { evaluateCrossBorderRouting } from "@/lib/crossBorderDataRoutingPolicy";

describe("cross-border data routing policy", () => {
  it("enforces transfer constraints", async () => {
    const result = await evaluateCrossBorderRouting({ dataRegion: "eu", destinationRegion: "us" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.allowed).toBe(false);
  });
});
