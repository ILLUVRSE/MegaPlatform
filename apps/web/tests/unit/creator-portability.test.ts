import { describe, expect, it } from "vitest";
import { validateCreatorImportPayload } from "@/lib/creatorPortability";

describe("creator portability", () => {
  it("accepts valid import payload under safeguards", async () => {
    const result = await validateCreatorImportPayload({
      profile: { handle: "creator", displayName: "Creator" },
      assets: [{ id: "a1", kind: "video", url: "https://x.local/a1.mp4" }]
    });
    expect(result.ok).toBe(true);
  });
});
