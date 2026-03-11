import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  distributionAction: {
    findMany: vi.fn(),
    create: vi.fn()
  },
  feedPost: {
    findMany: vi.fn()
  }
}));
const requireAdminMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/rbac", () => ({ requireAdmin: requireAdminMock }));

import { GET as getActions, POST as postAction } from "@/app/api/admin/distribution/actions/route";

describe("admin distribution actions api", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects unauthenticated access", async () => {
    requireAdminMock.mockResolvedValue({ ok: false, session: null });
    const response = await getActions();
    expect(response.status).toBe(401);
  });

  it("creates manual distribution action", async () => {
    requireAdminMock.mockResolvedValue({ ok: true, session: { user: { id: "admin-1", role: "admin" } } });
    prismaMock.distributionAction.create.mockResolvedValue({ id: "da-1" });

    const response = await postAction(
      new Request("http://localhost/api/admin/distribution/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "home",
          targetType: "SHORT",
          targetId: "post-1",
          actionType: "feature_in_home"
        })
      })
    );
    expect(response.status).toBe(200);
    expect(prismaMock.distributionAction.create).toHaveBeenCalled();
  });
});
