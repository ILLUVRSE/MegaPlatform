import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  platformSessionGraph: {
    findUnique: vi.fn(),
    upsert: vi.fn()
  }
}));

vi.mock("@illuvrse/db", () => ({
  prisma: prismaMock
}));

import {
  createDefaultPlatformSession,
  getPlatformSessionGraph,
  resolvePlatformSessionKey,
  upsertPlatformSessionGraph
} from "@/lib/platformSessionGraph";

describe("platform session graph", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("resolves user and anon session keys", () => {
    expect(resolvePlatformSessionKey({ userId: "user-1" })).toBe("user:user-1");
    expect(resolvePlatformSessionKey({ anonId: "anon-1" })).toBe("anon:anon-1");
  });

  it("returns a bootstrap home session when missing", async () => {
    prismaMock.platformSessionGraph.findUnique.mockResolvedValue(null);

    const session = await getPlatformSessionGraph({
      userId: "user-1",
      anonId: null,
      profileId: null,
      creatorProfileId: "creator-1"
    });

    expect(session.currentModule).toBe("home");
    expect(session.trail[0]?.action).toBe("bootstrap");
  });

  it("appends a trail entry during upsert", async () => {
    prismaMock.platformSessionGraph.findUnique.mockResolvedValue(null);
    prismaMock.platformSessionGraph.upsert.mockResolvedValue({});

    const session = await upsertPlatformSessionGraph({
      userId: "user-1",
      anonId: null,
      profileId: null,
      creatorProfileId: "creator-1",
      sessionKey: "user:user-1",
      currentModule: "watch",
      href: "/watch",
      action: "open_watch",
      state: { source: "home" }
    });

    expect(session.currentModule).toBe("watch");
    expect(session.trail.at(-1)?.href).toBe("/watch");
    expect(prismaMock.platformSessionGraph.upsert).toHaveBeenCalled();
  });

  it("creates a default session state with bounded fields", () => {
    const session = createDefaultPlatformSession({
      sessionKey: "anon:test",
      currentModule: "home",
      trail: []
    });

    expect(session.sessionKey).toBe("anon:test");
    expect(Array.isArray(session.trail)).toBe(true);
  });
});
