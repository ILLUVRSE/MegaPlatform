import { describe, expect, it } from "vitest";
import { evaluatePartyRoomsXrFlow } from "@/lib/partyRoomsXr";

describe("party rooms xr", () => {
  it("validates room join, voice, playlist, and host controls flow", async () => {
    const result = await evaluatePartyRoomsXrFlow({ enabledCapabilities: ["room_join", "voice", "playlist", "host_controls"], isGuest: false });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.flowOperational).toBe(true);
  });
});
