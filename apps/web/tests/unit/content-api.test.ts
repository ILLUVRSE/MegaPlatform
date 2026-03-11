import { beforeEach, describe, expect, it, vi } from "vitest";

const store = {
  content: {
    id: "content-1",
    type: "SHORT",
    title: "Draft",
    description: "desc",
    state: "DRAFT",
    creatorId: "user-1",
    createdAt: new Date("2026-02-28T00:00:00.000Z"),
    updatedAt: new Date("2026-02-28T00:00:00.000Z")
  }
};

const prismaMock = vi.hoisted(() => ({
  contentItem: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn()
  },
  contentStateTransition: {
    create: vi.fn()
  }
}));

const requireSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({
  prisma: prismaMock
}));

vi.mock("@/lib/authz", () => ({
  AuthzError: class AuthzError extends Error {
    status: 401 | 403;
    constructor(status: 401 | 403, message: string) {
      super(message);
      this.status = status;
    }
  },
  requireSession: requireSessionMock
}));

import { POST as createContent } from "@/app/api/studio/content/route";
import { POST as requestPublish } from "@/app/api/studio/content/[id]/request-publish/route";
import { POST as publishContent } from "@/app/api/studio/content/[id]/publish/route";

describe("content lifecycle APIs", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    store.content.state = "DRAFT";
    requireSessionMock.mockResolvedValue({ userId: "user-1", role: "user", permissions: [] });

    prismaMock.contentItem.create.mockImplementation(async ({ data }) => ({
      ...store.content,
      ...data,
      id: "content-1",
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    prismaMock.contentItem.findUnique.mockImplementation(async ({ where, include }) => {
      if (where.id !== store.content.id) return null;
      if (include?.assets) {
        return {
          ...store.content,
          assets: [{ id: "asset-1", kind: "VIDEO", url: "https://cdn/video.mp4" }]
        };
      }
      return { ...store.content };
    });

    prismaMock.contentItem.update.mockImplementation(async ({ data }) => {
      store.content.state = data.state ?? store.content.state;
      store.content.title = data.title ?? store.content.title;
      store.content.description = data.description ?? store.content.description;
      return { ...store.content, updatedAt: new Date() };
    });

    prismaMock.contentStateTransition.create.mockResolvedValue({ id: "transition-1" });
    prismaMock.contentItem.findMany.mockResolvedValue([]);
  });

  it("creates draft -> request publish -> publish", async () => {
    const createResponse = await createContent(
      new Request("http://localhost/api/studio/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "SHORT", title: "New draft", description: "desc" })
      })
    );

    expect(createResponse.status).toBe(201);

    const requestResponse = await requestPublish(
      new Request("http://localhost/api/studio/content/content-1/request-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Ready" })
      }),
      { params: Promise.resolve({ id: "content-1" }) }
    );

    expect(requestResponse.status).toBe(200);
    expect(store.content.state).toBe("REVIEW");

    const publishResponse = await publishContent(
      new Request("http://localhost/api/studio/content/content-1/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Approved" })
      }),
      { params: Promise.resolve({ id: "content-1" }) }
    );

    expect(publishResponse.status).toBe(200);
    expect(store.content.state).toBe("PUBLISHED");
    expect(prismaMock.contentStateTransition.create).toHaveBeenCalledTimes(2);
  });
});
