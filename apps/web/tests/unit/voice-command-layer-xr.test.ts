import { describe, expect, it } from "vitest";
import { dispatchVoiceCommandXr } from "@/lib/voiceCommandLayerXr";

describe("voice command layer xr", () => {
  it("parses and routes validated hands-free commands", async () => {
    const result = await dispatchVoiceCommandXr({ transcript: "join room", confidence: 0.92 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.parsed).toBe(true);
    expect(result.routed).toBe(true);
    expect(result.actionRoute).toBe("presence.room.join");
  });
});
