import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPartyVoiceObservabilityCard,
  readPartyVoiceSmokeSummary,
  setPartyVoiceSmokeOutputPathForTests,
  simulatePartyVoiceSmoke,
  writePartyVoiceSmokeSummary
} from "@/lib/partyVoicePerf";

describe("party voice perf smoke", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-13T12:00:00.000Z"));
    setPartyVoiceSmokeOutputPathForTests(path.join(process.cwd(), "tests", "tmp", "party-voice-perf-smoke.json"));
  });

  afterEach(() => {
    setPartyVoiceSmokeOutputPathForTests(null);
    vi.useRealTimers();
  });

  it("simulates simultaneous voice joins, jitter, packet loss, and reconnect latency", () => {
    const summary = simulatePartyVoiceSmoke({
      simultaneousConnections: 20,
      durationSeconds: 30,
      seed: 20260313
    });

    expect(summary.simulation.simultaneousConnections).toBe(20);
    expect(summary.simulation.totalPresencePings).toBeGreaterThanOrEqual(20);
    expect(summary.metrics.connectSetupMs.p95).toBeLessThan(1_000);
    expect(summary.metrics.jitterMs.median).toBeGreaterThan(0);
    expect(summary.metrics.packetLoss.ratio).toBeLessThan(0.03);
    expect(summary.metrics.reconnectLatencyMs.median).toBeLessThan(500);
    expect(summary.slos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "party-voice-connect-under-1s", pass: true }),
        expect.objectContaining({ id: "party-voice-median-reconnect-under-500ms", pass: true })
      ])
    );
    expect(summary.pass).toBe(true);
  });

  it("persists and exposes a card for admin observability", async () => {
    const summary = simulatePartyVoiceSmoke({
      roomId: "party-room-123",
      roomCode: "ROOM123",
      simultaneousConnections: 12,
      durationSeconds: 15,
      seed: 42
    });

    await writePartyVoiceSmokeSummary(summary);

    const stored = await readPartyVoiceSmokeSummary();
    const card = await buildPartyVoiceObservabilityCard();
    if (!card.available) {
      throw new Error("Expected party voice observability card to be available");
    }

    expect(stored?.roomId).toBe("party-room-123");
    expect(card.status).toBe("pass");
    expect(card.roomCode).toBe("ROOM123");
    expect(card.headline.connectP95Ms).toBe(summary.metrics.connectSetupMs.p95);
    expect(card.failedSlos).toHaveLength(0);
  });
});
