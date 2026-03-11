import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  studioTemplate: {
    findMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn()
  },
  studioProject: {
    create: vi.fn()
  }
}));
const requireSessionMock = vi.hoisted(() => vi.fn());
const ensureCreatorProfileMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/authz", () => ({ requireSession: requireSessionMock, AuthzError: class extends Error { status = 401; } }));
vi.mock("@/lib/creatorIdentity", () => ({ ensureCreatorProfile: ensureCreatorProfileMock }));

import { GET as listTemplates, POST as createTemplate } from "@/app/api/studio/templates/route";
import { POST as reuseTemplate } from "@/app/api/studio/templates/[id]/reuse/route";

describe("studio template APIs", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireSessionMock.mockResolvedValue({ userId: "user-1", role: "user", name: "Creator", email: "c@x.com" });
    ensureCreatorProfileMock.mockResolvedValue({ id: "cp-1" });
  });

  it("lists published templates", async () => {
    prismaMock.studioTemplate.findMany.mockResolvedValue([]);
    const response = await listTemplates(new Request("http://localhost/api/studio/templates"));
    expect(response.status).toBe(200);
    expect(prismaMock.studioTemplate.findMany).toHaveBeenCalled();
  });

  it("creates template with version 1", async () => {
    prismaMock.studioTemplate.create.mockResolvedValue({ id: "tpl-1" });
    const response = await createTemplate(
      new Request("http://localhost/api/studio/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Template", kind: "SHORT", schemaJson: {} })
      })
    );
    expect(response.status).toBe(200);
    expect(prismaMock.studioTemplate.create).toHaveBeenCalled();
  });

  it("reuses template into draft project", async () => {
    prismaMock.studioTemplate.findUnique.mockResolvedValue({
      id: "tpl-1",
      title: "Template",
      description: null,
      kind: "SHORT",
      latestVersion: 1,
      isPublished: true,
      versions: [{ version: 1, schemaJson: {} }]
    });
    prismaMock.studioProject.create.mockResolvedValue({ id: "proj-1" });

    const response = await reuseTemplate(
      new Request("http://localhost/api/studio/templates/tpl-1/reuse", { method: "POST" }),
      { params: Promise.resolve({ id: "tpl-1" }) }
    );
    expect(response.status).toBe(200);
    expect(prismaMock.studioProject.create).toHaveBeenCalled();
  });
});
