/**
 * Admin dashboard home.
 * Data: Prisma counts + recent AdminAudit entries.
 * Guard: requireAdmin (RBAC).
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";

export default async function AdminDashboardPage() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    redirect("/auth/signin");
  }
  const [showsCount, episodesCount, usersCount, audits] = await Promise.all([
    prisma.show.count(),
    prisma.episode.count(),
    prisma.user.count(),
    prisma.adminAudit.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { admin: true }
    })
  ]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Shows", value: showsCount },
          { label: "Episodes", value: episodesCount },
          { label: "Users", value: usersCount }
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
              {card.label}
            </p>
            <p className="mt-4 text-3xl font-semibold">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Admin Audits</h2>
            <Link href="/admin/audit" className="text-sm text-illuvrse-primary">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-4 text-sm">
            {audits.length === 0 ? (
              <p className="text-illuvrse-muted">No audits yet.</p>
            ) : (
              audits.map((audit) => (
                <div key={audit.id} className="rounded-xl border border-illuvrse-border p-3">
                  <p className="font-semibold">{audit.action}</p>
                  <p className="text-xs text-illuvrse-muted">{audit.details}</p>
                  <p className="text-xs text-illuvrse-muted">
                    {audit.admin.email} - {audit.createdAt.toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold">Quick Links</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <Link href="/admin/shows" className="rounded-xl border border-illuvrse-border p-3">
              Manage shows and seasons
            </Link>
            <Link href="/admin/episodes" className="rounded-xl border border-illuvrse-border p-3">
              Publish new episodes
            </Link>
            <Link href="/admin/live" className="rounded-xl border border-illuvrse-border p-3">
              Live channels and EPG
            </Link>
            <Link href="/admin/assets" className="rounded-xl border border-illuvrse-border p-3">
              Browse and moderate assets
            </Link>
            <Link href="/admin/profiles" className="rounded-xl border border-illuvrse-border p-3">
              Profile support tools
            </Link>
            <Link href="/admin/monetization" className="rounded-xl border border-illuvrse-border p-3">
              Monetization controls
            </Link>
            <Link href="/admin/users" className="rounded-xl border border-illuvrse-border p-3">
              Review users and roles
            </Link>
            <Link href="/admin/feed/posts" className="rounded-xl border border-illuvrse-border p-3">
              Moderate home feed posts
            </Link>
            <Link href="/admin/feed/reports" className="rounded-xl border border-illuvrse-border p-3">
              Resolve feed reports
            </Link>
            <Link href="/admin/platform" className="rounded-xl border border-illuvrse-border p-3">
              Track platform app engagement
            </Link>
            <Link href="/admin/ops" className="rounded-xl border border-illuvrse-border p-3">
              Ops command center queue
            </Link>
            <Link href="/admin/media-corp" className="rounded-xl border border-illuvrse-border p-3">
              Media-corp sandbox and review loop
            </Link>
            <a href="/api/admin/observability/summary" className="rounded-xl border border-illuvrse-border p-3">
              Observability + SLO summary (API)
            </a>
            <a href="/api/admin/deploy/promotion-readiness" className="rounded-xl border border-illuvrse-border p-3">
              Deployment promotion readiness (API)
            </a>
            <a href="/api/admin/growth/recommendations" className="rounded-xl border border-illuvrse-border p-3">
              Growth recommendation intelligence (API)
            </a>
            <a href="/api/admin/finance/guardrails" className="rounded-xl border border-illuvrse-border p-3">
              Financial guardrails (API)
            </a>
            <a href="/api/admin/compliance/status" className="rounded-xl border border-illuvrse-border p-3">
              Compliance readiness status (API)
            </a>
            <a href="/api/admin/launch/readiness" className="rounded-xl border border-illuvrse-border p-3">
              Launch readiness gates (API)
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
