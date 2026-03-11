import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  studioProject: { findMany: vi.fn() },
  studioTemplate: { findMany: vi.fn() },
  creatorProgression: { findUnique: vi.fn() },
  revenueAttribution: { findMany: vi.fn() },
  remixJob: { findMany: vi.fn() }
}));
const requireSessionMock = vi.hoisted(() => vi.fn());
const ensureCreatorProfileMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/authz", () => ({ requireSession: requireSessionMock, AuthzError: class extends Error { status = 401; } }));
vi.mock("@/lib/creatorIdentity", () => ({ ensureCreatorProfile: ensureCreatorProfileMock }));

import { GET as getControlCenter } from "@/app/api/creator/control-center/route";

describe("creator control center api", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireSessionMock.mockResolvedValue({ userId: "user-1", role: "user", name: "Creator", email: "c@x.com" });
    ensureCreatorProfileMock.mockResolvedValue({
      id: "cp-1",
      handle: "creator",
      displayName: "Creator",
      reputationScore: 0
    });
    prismaMock.studioProject.findMany.mockResolvedValue([]);
    prismaMock.studioTemplate.findMany.mockResolvedValue([]);
    prismaMock.creatorProgression.findUnique.mockResolvedValue(null);
    prismaMock.revenueAttribution.findMany.mockResolvedValue([]);
    prismaMock.remixJob.findMany.mockResolvedValue([]);
  });

  it("returns control center payload", async () => {
    const response = await getControlCenter(new Request("http://localhost/api/creator/control-center"));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(payload.creator.handle).toBe("creator");
  });
});
