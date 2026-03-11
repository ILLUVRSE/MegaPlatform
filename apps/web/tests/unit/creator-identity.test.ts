import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  creatorProfile: {
    findUnique: vi.fn(),
    create: vi.fn()
  }
}));

vi.mock("@illuvrse/db", () => ({
  prisma: prismaMock
}));

import { ensureCreatorProfile } from "@/lib/creatorIdentity";

describe("creator identity", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns existing creator profile", async () => {
    prismaMock.creatorProfile.findUnique.mockResolvedValue({ id: "cp-1", userId: "user-1", handle: "creator" });
    const profile = await ensureCreatorProfile({ id: "user-1", name: "Creator" });
    expect(profile.id).toBe("cp-1");
    expect(prismaMock.creatorProfile.create).not.toHaveBeenCalled();
  });

  it("creates creator profile when missing", async () => {
    prismaMock.creatorProfile.findUnique.mockResolvedValue(null);
    prismaMock.creatorProfile.create.mockResolvedValue({ id: "cp-2", userId: "user-1", handle: "creator" });
    const profile = await ensureCreatorProfile({ id: "user-1", name: "Creator Name" });
    expect(profile.id).toBe("cp-2");
    expect(prismaMock.creatorProfile.create).toHaveBeenCalled();
  });
});
