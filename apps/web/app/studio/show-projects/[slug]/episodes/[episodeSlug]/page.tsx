import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrincipal } from "@/lib/authz";
import { findShowEpisodeByProjectAndSlug } from "@/lib/showEpisodes";
import { listDerivedShortDrafts } from "@/lib/showShortDrafts";
import { listShowScenes } from "@/lib/showScenes";
import { findShowProjectWithOwnerBySlug, getShowProjectAccessForUser } from "@/lib/showProjects";
import ShowEpisodeSceneEditor from "./components/ShowEpisodeSceneEditor";

export default async function StudioShowEpisodeDetailPage({
  params
}: {
  params: Promise<{ slug: string; episodeSlug: string }>;
}) {
  const principal = await getPrincipal();
  if (!principal) {
    return (
      <div className="party-card space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Studio Shows</p>
        <h1 className="text-3xl font-semibold">Sign in to edit episode scenes</h1>
        <Link
          href="/api/auth/signin?callbackUrl=/studio/show-projects"
          className="interactive-focus inline-flex rounded-full bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-slate-950"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const { slug, episodeSlug } = await params;
  const project = await findShowProjectWithOwnerBySlug(slug);

  if (!project) {
    notFound();
  }

  const access = await getShowProjectAccessForUser(principal, project.id);
  if (!access.permissions.read) {
    notFound();
  }

  const episode = await findShowEpisodeByProjectAndSlug(project.id, episodeSlug);
  if (!episode) {
    notFound();
  }

  const scenes = await listShowScenes(episode.id);
  const shortDrafts = await listDerivedShortDrafts(episode.id);
  const serializedEpisode = {
    ...episode,
    publishedAt: episode.publishedAt?.toISOString() ?? null,
    createdAt: episode.createdAt.toISOString(),
    updatedAt: episode.updatedAt.toISOString()
  };
  const serializedScenes = scenes.map((scene) => ({
    ...scene,
    createdAt: scene.createdAt.toISOString(),
    updatedAt: scene.updatedAt.toISOString()
  }));
  const serializedShortDrafts = shortDrafts.map((draft) => ({
    ...draft,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString()
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-3">
        <Link
          href={`/studio/show-projects/${project.slug}`}
          className="interactive-focus rounded-full border border-white/15 bg-white/5 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-white"
        >
          Back to project
        </Link>
      </div>
      <ShowEpisodeSceneEditor
        episode={serializedEpisode}
        initialScenes={serializedScenes}
        initialShortDrafts={serializedShortDrafts}
        permissions={access.permissions}
      />
    </div>
  );
}
