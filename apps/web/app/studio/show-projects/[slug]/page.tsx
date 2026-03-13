import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrincipal } from "@/lib/authz";
import { listShowEpisodes } from "@/lib/showEpisodes";
import { canManageAllShowProjects, findShowProjectWithOwnerBySlug } from "@/lib/showProjects";
import ShowProjectEpisodesManager from "./components/ShowProjectEpisodesManager";

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

  const episodes = await listShowEpisodes(project.id);
  const serializedProject = {
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString()
  };
  const serializedEpisodes = episodes.map((episode) => ({
    ...episode,
    createdAt: episode.createdAt.toISOString(),
    updatedAt: episode.updatedAt.toISOString()
  }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href="/studio/show-projects"
          className="interactive-focus rounded-full border border-white/15 bg-white/5 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-white"
        >
          Back to projects
        </Link>
      </div>
      <ShowProjectEpisodesManager project={serializedProject} initialEpisodes={serializedEpisodes} />
    </div>
  );
}
