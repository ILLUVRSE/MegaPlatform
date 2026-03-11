import { GET, POST } from "@/app/api/admin/shows/route";

const prismaMocks = vi.hoisted(() => ({
  show: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn()
  }
}));

vi.mock("@illuvrse/db", () => ({
  prisma: prismaMocks
}));

vi.mock("@/lib/rbac", () => ({
  requireAdmin: vi.fn()
}));

vi.mock("@/lib/audit", () => ({
  writeAudit: vi.fn().mockResolvedValue(undefined)
}));

describe("api/admin/shows", () => {
  it("lists shows with pagination", async () => {
    const { requireAdmin } = await import("@/lib/rbac");
    (requireAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      session: { user: { id: "admin" } }
    });
    prismaMocks.show.count.mockResolvedValueOnce(1);
    prismaMocks.show.findMany.mockResolvedValueOnce([
      { id: "1", title: "Show", slug: "show", createdAt: new Date() }
    ]);

    const res = await GET(new Request("http://localhost/api/admin/shows?page=1"));
    const json = await res.json();

    expect(json.data).toHaveLength(1);
    expect(json.page).toBe(1);
  });

  it("creates a show", async () => {
    const { requireAdmin } = await import("@/lib/rbac");
    (requireAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      session: { user: { id: "admin" } }
    });
    prismaMocks.show.create.mockResolvedValueOnce({ id: "show-1", title: "New Show" });

    const res = await POST(
      new Request("http://localhost/api/admin/shows", {
        method: "POST",
        body: JSON.stringify({
          title: "New Show",
          slug: "new-show",
          description: "Desc",
          posterUrl: "https://placehold.co/1",
          heroUrl: "https://placehold.co/2"
        })
      })
    );

    const json = await res.json();
    expect(json.id).toBe("show-1");
  });

  it("rejects non-admin access", async () => {
    const { requireAdmin } = await import("@/lib/rbac");
    (requireAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, session: null });

    const res = await GET(new Request("http://localhost/api/admin/shows?page=1"));
    expect(res.status).toBe(401);
  });
});
