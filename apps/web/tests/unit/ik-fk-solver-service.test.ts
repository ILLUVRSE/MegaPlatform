import { describe, expect, it } from "vitest";
import { evaluateIkFkSolverService } from "@/lib/ikFkSolverService";

describe("ik/fk solver service", () => {
  it("applies deterministic fallback behavior", async () => {
    const result = await evaluateIkFkSolverService({ chainLength: 8, solveIterations: 10, targetReachable: false });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.solverReusable).toBe(true);
    expect(result.deterministicFallback).toBe(true);
    expect(result.fallbackMode).toBe("fk_lock");
  });
});
