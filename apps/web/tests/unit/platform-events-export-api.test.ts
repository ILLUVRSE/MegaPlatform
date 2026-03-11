import { describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  $queryRaw: vi.fn()
}));

const requireAdminMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({
  prisma: prismaMock
}));

vi.mock("@/lib/rbac", () => ({
  requireAdmin: requireAdminMock
}));

import { GET } from "@/app/api/admin/platform/events/export/route";

describe("admin platform event export api", () => {
  it("rejects non-admin users", async () => {
    requireAdminMock.mockResolvedValueOnce({ ok: false, session: null });

    const response = await GET(new Request("http://localhost/api/admin/platform/events/export?range=7d"));
    expect(response.status).toBe(401);
  });

  it("returns csv with headers and escaped values", async () => {
    requireAdminMock.mockResolvedValueOnce({
      ok: true,
      session: { user: { id: "admin-1", role: "admin" } }
    });
    prismaMock.$queryRaw.mockResolvedValueOnce([
      {
        createdAt: new Date("2026-03-02T10:00:00.000Z"),
        event: "module_open",
        module: 'GameGrid "Pro"',
        surface: "apps_directory",
        href: "/gamegrid?mode=pro,ranked"
      }
    ]);

    const response = await GET(new Request("http://localhost/api/admin/platform/events/export?range=24h"));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Content-Disposition")).toContain("platform-events-24h-");
    expect(body).toContain("created_at,event,module,surface,href");
    expect(body).toContain('module_open,"GameGrid ""Pro""",apps_directory,"/gamegrid?mode=pro,ranked"');
  });
});
