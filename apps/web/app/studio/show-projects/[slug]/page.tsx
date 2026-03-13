import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrincipal } from "@/lib/authz";
import { canManageAllShowProjects, findShowProjectWithOwnerBySlug } from "@/lib/showProjects";

export default async function StudioShowProjectDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const principal = await getPrincipal();
  if (!principal) {
    return (
      <div className="party-card space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Studio Shows</p>
        <h1 className="text-3xl font-semibold">Sign in to view this show project</h1>
        <Link
          href="/api/auth/signin?callbackUrl=/studio/show-projects"
          className="interactive-focus inline-flex rounded-full bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-slate-950"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const { slug } = await params;
  const project = await findShowProjectWithOwnerBySlug(slug);

  if (!project) {
    notFound();
  }

  if (!canManageAllShowProjects(principal) && project.ownerId !== principal.userId) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <section className="party-card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">
              {project.format} Project
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{project.title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-white/75">
              {project.description || "No description yet."}
            </p>
          </div>
          <Link
            href="/studio/show-projects"
            className="interactive-focus rounded-full border border-white/15 bg-white/5 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-white"
          >
            Back to projects
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Status</p>
            <p className="mt-2 text-lg font-semibold text-white">{project.status}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Slug</p>
            <p className="mt-2 text-lg font-semibold text-white">{project.slug}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Owner</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {project.ownerName || project.ownerEmail || project.ownerId}
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Updated</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {project.updatedAt.toLocaleDateString()}
            </p>
          </div>
        </div>
      </section>

      <section className="party-card space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Project Shell</p>
        <h2 className="text-xl font-semibold">Metadata and production workspace</h2>
        <p className="text-sm text-illuvrse-muted">
          This shell is ready for episode, asset, publishing, and collaboration flows to land on top
          of a first-class show project record.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Poster image</p>
            <p className="mt-2 text-sm text-white/75">{project.posterImageUrl || "Not set"}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Banner image</p>
            <p className="mt-2 text-sm text-white/75">{project.bannerImageUrl || "Not set"}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
