/**
 * Unit tests for shorts monetization + purchase access.
 * Request/response: validates monetization, purchase, and access flows.
 * Guard: mocks Prisma and next-auth.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  shortPost: {
    findUnique: vi.fn(),
    update: vi.fn()
  },
  shortPurchase: {
    findFirst: vi.fn(),
    create: vi.fn()
  },
  creatorProfile: {
    findUnique: vi.fn()
  },
  revenueAttribution: {
    create: vi.fn()
  }
}));

const getServerSessionMock = vi.hoisted(() => vi.fn());
const requireAdminMock = vi.hoisted(() => vi.fn());
const applyCreatorProgressEventMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({
  prisma: prismaMock
}));

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock
}));

vi.mock("@/lib/authz", () => ({
  AuthzError: class AuthzError extends Error {
    status: 401 | 403;
    constructor(status: 401 | 403, message: string) {
      super(message);
      this.status = status;
    }
  },
  requireAdmin: requireAdminMock
}));

vi.mock("@/lib/creatorProgression", () => ({
  applyCreatorProgressEvent: applyCreatorProgressEventMock
}));

import { POST as monetizePost } from "@/app/api/shorts/[id]/monetize/route";
import { POST as purchasePost } from "@/app/api/shorts/[id]/purchase/route";
import { GET as accessGet } from "@/app/api/shorts/[id]/access/route";

describe("shorts paywall APIs", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getServerSessionMock.mockResolvedValue(null);
    requireAdminMock.mockResolvedValue({ userId: "admin-1", role: "admin", permissions: ["admin:*"] });
    prismaMock.shortPost.findUnique.mockResolvedValue({
      id: "short-1",
      isPremium: true,
      price: 399,
      createdById: "creator-user-1",
      projectId: "proj-1"
    });
    prismaMock.creatorProfile.findUnique.mockResolvedValue({ id: "cp-1" });
  });

  it("requires price for premium shorts", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPremium: true })
    });

    const response = await monetizePost(request, { params: Promise.resolve({ id: "short-1" }) });
    expect(response.status).toBe(400);
  });

  it("requires admin for monetize endpoint", async () => {
    requireAdminMock.mockRejectedValueOnce(new Error("Unauthorized"));
    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPremium: false })
    });
    const response = await monetizePost(request, { params: Promise.resolve({ id: "short-1" }) });
    expect(response.status).toBe(401);
  });

  it("creates purchase for anon buyer", async () => {
    prismaMock.shortPurchase.findFirst.mockResolvedValueOnce(null);
    prismaMock.shortPurchase.create.mockResolvedValueOnce({ id: "purchase-1" });

    const request = new Request("http://localhost", {
      method: "POST"
    });

    const response = await purchasePost(request, { params: Promise.resolve({ id: "short-1" }) });
    expect(response.status).toBe(200);
    expect(prismaMock.shortPurchase.create).toHaveBeenCalled();
    expect(prismaMock.revenueAttribution.create).toHaveBeenCalled();
    expect(applyCreatorProgressEventMock).toHaveBeenCalled();
    expect(prismaMock.shortPurchase.create.mock.calls[0]?.[0]?.data).toEqual(
      expect.objectContaining({
        shortPostId: "short-1",
        buyerId: null
      })
    );
  });

  it("returns access after purchase", async () => {
    prismaMock.shortPurchase.findFirst.mockResolvedValueOnce({ id: "purchase-1" });

    const request = new Request("http://localhost", {
      method: "GET",
      headers: { cookie: "ILLUVRSE_ANON_ID=anon-123" }
    });

    const response = await accessGet(request, { params: Promise.resolve({ id: "short-1" }) });
    const payload = (await response.json()) as { hasAccess: boolean };
    expect(payload.hasAccess).toBe(true);
  });

  it("returns free access for non-premium shorts", async () => {
    prismaMock.shortPost.findUnique.mockResolvedValueOnce({
      id: "short-2",
      isPremium: false,
      price: null
    });

    const response = await accessGet(new Request("http://localhost"), {
      params: Promise.resolve({ id: "short-2" })
    });
    const payload = (await response.json()) as { hasAccess: boolean; requiresPurchase: boolean };
    expect(payload.hasAccess).toBe(true);
    expect(payload.requiresPurchase).toBe(false);
  });
});
