import { describe, expect, it } from "vitest";
import { createLiveKitAccessToken } from "@/lib/livekitToken";

describe("livekit token helper", () => {
  it("creates a jwt-like token with bounded ttl", () => {
    const result = createLiveKitAccessToken({
      apiKey: "key",
      apiSecret: "secret",
      identity: "user-1",
      roomName: "party-ABC123",
      ttlSec: 5
    });

    expect(result.expiresInSec).toBeGreaterThanOrEqual(60);
    expect(result.token.split(".")).toHaveLength(3);
  });
});
