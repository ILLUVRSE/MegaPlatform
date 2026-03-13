import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrincipal } from "@/lib/authz";
import { listShowEpisodes } from "@/lib/showEpisodes";
import { listShowExtras } from "@/lib/showExtras";
import {
  findShowProjectWithOwnerBySlug,
  getShowProjectAccessForUser,
  listShowProjectCollaborators
} from "@/lib/showProjects";
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

  const access = await getShowProjectAccessForUser(principal, project.id);
  if (!access.permissions.read) {
    notFound();
  }

  const [episodes, extras, collaborators] = await Promise.all([
    listShowEpisodes(project.id),
    listShowExtras(project.id),
    listShowProjectCollaborators(project.id)
  ]);
  const serializedProject = {
    ...project,
    publishedAt: project.publishedAt?.toISOString() ?? null,
    releaseAt: project.releaseAt?.toISOString() ?? null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString()
  };
  const serializedEpisodes = episodes.map((episode) => ({
    ...episode,
    publishedAt: episode.publishedAt?.toISOString() ?? null,
    releaseAt: episode.releaseAt?.toISOString() ?? null,
    premiereStartsAt: episode.premiereStartsAt?.toISOString() ?? null,
    premiereEndsAt: episode.premiereEndsAt?.toISOString() ?? null,
    createdAt: episode.createdAt.toISOString(),
    updatedAt: episode.updatedAt.toISOString()
  }));
  const serializedExtras = extras.map((extra) => ({
    ...extra,
    publishedAt: extra.publishedAt?.toISOString() ?? null,
    releaseAt: extra.releaseAt?.toISOString() ?? null,
    createdAt: extra.createdAt.toISOString(),
    updatedAt: extra.updatedAt.toISOString()
  }));
  const serializedCollaborators = collaborators.map((collaborator) => ({
    ...collaborator,
    createdAt: collaborator.createdAt.toISOString(),
    updatedAt: collaborator.updatedAt.toISOString()
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
      <ShowProjectEpisodesManager
        project={serializedProject}
        initialEpisodes={serializedEpisodes}
        initialExtras={serializedExtras}
        collaborators={serializedCollaborators}
        currentUserRole={access.role}
        permissions={access.permissions}
      />
    </div>
  );
}
