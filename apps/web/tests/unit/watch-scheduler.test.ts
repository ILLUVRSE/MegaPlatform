import { describe, expect, it, vi } from "vitest";
import { computeNowNext, generateSchedules } from "../../../../packages/watch-scheduler/src/lib";

describe("watch scheduler", () => {
  it("generates programs for virtual channels", async () => {
    const createMock = vi.fn();
    const prismaMock = {
      liveChannel: {
        findMany: vi.fn().mockResolvedValue([
          { id: "channel-1", isVirtual: true, isActive: true, defaultProgramDurationMin: 30 }
        ])
      },
      episode: {
        findMany: vi.fn().mockResolvedValue([
          { id: "ep-1", title: "Episode 1", description: "Test", lengthSeconds: 1200 },
          { id: "ep-2", title: "Episode 2", description: "Test", lengthSeconds: 1200 }
        ])
      },
      liveProgram: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: createMock
      }
    } as any;

    const fixedNow = new Date("2026-02-12T12:00:00.000Z");
    await generateSchedules(prismaMock, fixedNow);
    expect(createMock).toHaveBeenCalled();

    const created = createMock.mock.calls.map((call) => call[0].data);
    const firstStart = created[0].startsAt as Date;
    const lastEnd = created[created.length - 1].endsAt as Date;
    expect(firstStart.getTime()).toBe(fixedNow.getTime());
    expect(lastEnd.getTime()).toBeGreaterThanOrEqual(fixedNow.getTime() + 24 * 60 * 60 * 1000);
  });

  it("computes now and next from fixed clock", () => {
    const now = new Date("2026-02-12T12:15:00.000Z");
    const programs = [
      { id: "p1", startsAt: new Date("2026-02-12T11:30:00.000Z"), endsAt: new Date("2026-02-12T12:30:00.000Z") },
      { id: "p2", startsAt: new Date("2026-02-12T12:30:00.000Z"), endsAt: new Date("2026-02-12T13:00:00.000Z") }
    ];

    const result = computeNowNext(programs, now);
    expect(result.now?.id).toBe("p1");
    expect(result.next?.id).toBe("p2");
  });
});
