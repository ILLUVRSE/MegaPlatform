import { describe, expect, it } from "vitest";
import { evaluateSensitiveContextIsolation } from "@/lib/sensitiveContextIsolationV1";

describe("sensitive context isolation v1", () => {
  it("requires elevated controls for sensitive contexts", async () => {
    const result = await evaluateSensitiveContextIsolation({ actionId: "a-176", context: "health", approvals: 1, policyTags: ["sensitive_context"] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.allowed).toBe(false);
  });
});
