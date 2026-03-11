/**
 * Reports page.
 * Data: Prisma aggregate counts for shows/seasons/episodes/users.
 * Guard: requireAdmin (RBAC).
 */
import { redirect } from "next/navigation";
import ReportsChart from "@/components/admin/ReportsChart";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";

export default async function ReportsPage() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    redirect("/auth/signin");
  }
  const [shows, seasons, episodes, users] = await Promise.all([
    prisma.show.count(),
    prisma.season.count(),
    prisma.episode.count(),
    prisma.user.count()
  ]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Shows", value: shows },
          { label: "Seasons", value: seasons },
          { label: "Episodes", value: episodes },
          { label: "Users", value: users }
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">{card.label}</p>
            <p className="mt-4 text-2xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>
      <ReportsChart
        data={[
          { label: "Shows", value: shows },
          { label: "Seasons", value: seasons },
          { label: "Episodes", value: episodes },
          { label: "Users", value: users }
        ]}
      />
    </div>
  );
}
