import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deletePersonalizationState,
  getPersonalizationCacheSnapshot,
  getPersonalizationState,
  resetPersonalizationCache,
  setPersonalizationState
} from "@/lib/intelligence/personalizationCache";

const requireAdminMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/rbac", () => ({
  requireAdmin: requireAdminMock
}));

import { GET } from "@/app/api/admin/platform/personalization/cache/route";

describe("personalization cache diagnostics", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetPersonalizationCache();
  });

  it("tracks cache metrics and redacts recent keys", () => {
    setPersonalizationState("viewer:alpha-12345", {
      updatedAt: Date.now(),
      preferences: { watch: 1 }
    });
    expect(getPersonalizationState("viewer:alpha-12345")?.preferences.watch).toBe(1);
    expect(getPersonalizationState("viewer:missing")).toBeNull();
    expect(deletePersonalizationState("viewer:alpha-12345")).toBe(true);

    const snapshot = getPersonalizationCacheSnapshot();
    expect(snapshot).toMatchObject({
      size: 0,
      hits: 1,
      misses: 1,
      sets: 1,
      evictions: {
        total: 1,
        expired: 0,
        manual: 1
      }
    });
    expect(snapshot.recentKeys[0]).toMatchObject({
      operation: "delete",
      key: "vie***45"
    });
    expect(snapshot.recentKeys.some((entry) => entry.key.includes("alpha-12345"))).toBe(false);
  });

  it("expires stale entries and counts eviction metrics", () => {
    setPersonalizationState("viewer:stale-98765", {
      updatedAt: Date.now() - 301_000,
      preferences: { games: 0.2 }
    });

    expect(getPersonalizationState("viewer:stale-98765")).toBeNull();

    const snapshot = getPersonalizationCacheSnapshot();
    expect(snapshot.size).toBe(0);
    expect(snapshot.misses).toBe(1);
    expect(snapshot.evictions).toEqual({
      total: 1,
      expired: 1,
      manual: 0
    });
    expect(snapshot.recentKeys[0]).toMatchObject({
      operation: "expire",
      key: "vie***65"
    });
  });

  it("returns diagnostics payload for admins", async () => {
    setPersonalizationState("viewer:route-12345", {
      updatedAt: Date.now(),
      preferences: { studio: 0.8 }
    });
    getPersonalizationState("viewer:route-12345");
    getPersonalizationState("viewer:missing");

    requireAdminMock.mockResolvedValue({
      ok: true,
      session: { user: { id: "admin-1", role: "admin" } }
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      generatedAt: expect.any(String),
      cache: {
        size: 1,
        ttlMs: 300000,
        hits: 1,
        misses: 1,
        sets: 1,
        evictions: {
          total: 0,
          expired: 0,
          manual: 0
        },
        recentKeys: expect.arrayContaining([
          expect.objectContaining({
            operation: "miss",
            key: "vie***ng",
            at: expect.any(String)
          })
        ])
      }
    });
    expect(payload.cache.recentKeys.every((entry: { key: string }) => !entry.key.includes("route-12345"))).toBe(true);
  });

  it("rejects non-admin requests", async () => {
    requireAdminMock.mockResolvedValue({ ok: false, session: null });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });
});
