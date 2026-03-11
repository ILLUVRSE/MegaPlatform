import { describe, expect, it } from "vitest";
import { buildDailyTrend, getRangeSince, resolvePlatformRange } from "@/lib/platformAnalytics";

describe("platform analytics helpers", () => {
  it("normalizes unknown ranges to 7d", () => {
    expect(resolvePlatformRange(undefined)).toBe("7d");
    expect(resolvePlatformRange("invalid")).toBe("7d");
    expect(resolvePlatformRange("24h")).toBe("24h");
    expect(resolvePlatformRange("30d")).toBe("30d");
  });

  it("computes correct range offsets", () => {
    const now = new Date("2026-03-02T12:00:00.000Z");
    expect(getRangeSince("24h", now).toISOString()).toBe("2026-03-01T12:00:00.000Z");
    expect(getRangeSince("7d", now).toISOString()).toBe("2026-02-23T12:00:00.000Z");
    expect(getRangeSince("30d", now).toISOString()).toBe("2026-01-31T12:00:00.000Z");
  });

  it("fills missing days in trend output", () => {
    const since = new Date("2026-03-01T00:00:00.000Z");
    const now = new Date("2026-03-03T12:00:00.000Z");
    const trend = buildDailyTrend(
      [
        { day: new Date("2026-03-01T00:00:00.000Z"), count: 5n },
        { day: new Date("2026-03-03T00:00:00.000Z"), count: 2n }
      ],
      since,
      now
    );

    expect(trend).toEqual([
      { dayKey: "2026-03-01", label: "03-01", count: 5 },
      { dayKey: "2026-03-02", label: "03-02", count: 0 },
      { dayKey: "2026-03-03", label: "03-03", count: 2 }
    ]);
  });
});
