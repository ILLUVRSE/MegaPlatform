/**
 * My shorts list.
 * Request/response: renders recent short projects from DB.
 * Guard: none; public for MVP.
 */
import { prisma } from "@illuvrse/db";
import Link from "next/link";

const statusGroups = [
  {
    id: "drafts",
    label: "Drafts",
    statuses: ["DRAFT"],
    action: "Continue"
  },
  {
    id: "rendering",
    label: "Rendering",
    statuses: ["QUEUED", "PROCESSING", "COMPLETED"],
    action: "Open"
  },
  {
    id: "failed",
    label: "Failed",
    statuses: ["FAILED"],
    action: "Retry"
  },
  {
    id: "published",
    label: "Published",
    statuses: ["PUBLISHED"],
    action: "Open"
  }
];

const statusDetail: Record<string, string> = {
  DRAFT: "Draft",
  QUEUED: "Queued",
  PROCESSING: "Rendering",
  COMPLETED: "Ready to publish",
  FAILED: "Failed",
  PUBLISHED: "Published"
};

export default async function MyShorts() {
  const projects = await prisma.studioProject.findMany({
    where: {
      type: { in: ["SHORT", "REMIX"] }
    },
    orderBy: { updatedAt: "desc" },
    take: 12
  });

  if (projects.length === 0) {
    return (
      <div className="party-card space-y-2">
        <h3 className="text-lg font-semibold">My Shorts</h3>
        <p className="text-sm text-illuvrse-muted">No shorts yet. Start your first one above.</p>
      </div>
    );
  }

  return (
    <div className="party-card space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Recent Projects</p>
        <h3 className="text-lg font-semibold">My Shorts</h3>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {statusGroups.map((group) => {
          const groupProjects = projects.filter((project) =>
            group.statuses.includes(project.status)
          );

          return (
            <div key={group.id} className="rounded-md border border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{group.label}</p>
                <span className="text-xs text-illuvrse-muted">{groupProjects.length} items</span>
              </div>
              {groupProjects.length === 0 ? (
                <p className="text-xs text-illuvrse-muted">Nothing here yet.</p>
              ) : (
                <div className="space-y-2">
                  {groupProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <div>
                        <p className="font-semibold">{project.title}</p>
                        <p className="text-xs text-illuvrse-muted">
                          {statusDetail[project.status] ?? project.status}
                        </p>
                      </div>
                      <Link
                        href={`/studio/short?projectId=${project.id}`}
                        className="text-xs font-semibold uppercase tracking-widest text-illuvrse-primary"
                      >
                        {group.action}
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
