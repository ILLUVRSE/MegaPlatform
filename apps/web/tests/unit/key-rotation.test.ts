import { describe, expect, it } from "vitest";
import { buildKeyRotationStatus } from "@/lib/keyRotation";
import { createLiveKitAccessToken } from "@/lib/livekitToken";
import {
  createJwtSessionToken,
  validateSecretMaterial,
  verifyHs256Token,
  verifyLiveKitToken
} from "../../../../scripts/security/key-rotation-check.mjs";

describe("key rotation status", () => {
  it("detects overdue key rotation entries", async () => {
    const status = await buildKeyRotationStatus(new Date("2026-06-01T00:00:00.000Z"));
    expect(status.entries.length).toBeGreaterThan(0);
    expect(status.overdue.length).toBeGreaterThan(0);
  });

  it("accepts rotated JWT secrets during the overlap window", () => {
    const currentSecret = validateSecretMaterial("NEXTAUTH_SECRET", "0123456789abcdef0123456789abcdef");
    const rotatedSecret = validateSecretMaterial("NEXTAUTH_SECRET", "fedcba9876543210fedcba9876543210");
    const token = createJwtSessionToken(rotatedSecret, 1_773_353_600);

    expect(verifyHs256Token(token, [rotatedSecret, currentSecret])).toEqual(
      expect.objectContaining({
        payload: expect.objectContaining({
          sub: "rotation-user",
          userId: "rotation-user"
        })
      })
    );
  });

  it("accepts rotated LiveKit credentials for new token issuance", () => {
    const currentApiKey = validateSecretMaterial("LIVEKIT_API_KEY", "lk_current_rotation_key");
    const currentApiSecret = validateSecretMaterial("LIVEKIT_API_SECRET", "livekit-current-rotation-secret");
    const rotatedApiKey = validateSecretMaterial("LIVEKIT_API_KEY", "lk_rotated_rotation_key");
    const rotatedApiSecret = validateSecretMaterial("LIVEKIT_API_SECRET", "livekit-rotated-rotation-secret");

    const currentToken = createLiveKitAccessToken({
      apiKey: currentApiKey,
      apiSecret: currentApiSecret,
      identity: "rotation-user",
      roomName: "rotation-room"
    }).token;
    const rotatedToken = createLiveKitAccessToken({
      apiKey: rotatedApiKey,
      apiSecret: rotatedApiSecret,
      identity: "rotation-user",
      roomName: "rotation-room"
    }).token;

    const overlapKeyRing = new Map([
      [currentApiKey, currentApiSecret],
      [rotatedApiKey, rotatedApiSecret]
    ]);

    expect(verifyLiveKitToken(currentToken, overlapKeyRing)).toBeTruthy();
    expect(verifyLiveKitToken(rotatedToken, overlapKeyRing)).toEqual(
      expect.objectContaining({
        payload: expect.objectContaining({
          iss: rotatedApiKey,
          sub: "rotation-user"
        })
      })
    );
  });
});
