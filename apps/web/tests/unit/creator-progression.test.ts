import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  creatorProgression: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  },
  creatorProgressEvent: {
    create: vi.fn()
  },
  $transaction: vi.fn()
}));

vi.mock("@illuvrse/db", () => ({
  prisma: prismaMock
}));

import { applyCreatorProgressEvent } from "@/lib/creatorProgression";

describe("creator progression", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates baseline progression and applies points", async () => {
    prismaMock.creatorProgression.findUnique.mockResolvedValue(null);
    prismaMock.creatorProgression.create.mockResolvedValue({
      id: "prog-1",
      creatorProfileId: "cp-1",
      level: 1,
      xp: 0,
      tier: "RISING",
      rewardsEarned: 0
    });
    prismaMock.creatorProgression.update.mockResolvedValue({
      id: "prog-1",
      creatorProfileId: "cp-1",
      level: 2,
      xp: 520,
      tier: "RISING",
      rewardsEarned: 1
    });
    prismaMock.creatorProgressEvent.create.mockResolvedValue({ id: "evt-1" });
    prismaMock.$transaction.mockImplementation((ops: unknown[]) => Promise.all(ops as Promise<unknown>[]));

    const result = await applyCreatorProgressEvent({ creatorProfileId: "cp-1", source: "short_purchase", points: 520 });
    expect(result?.level).toBe(2);
    expect(prismaMock.creatorProgressEvent.create).toHaveBeenCalled();
  });
});
