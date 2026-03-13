import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrincipal } from "@/lib/authz";
import { findShowEpisodeByProjectAndSlug } from "@/lib/showEpisodes";
import { listInteractiveExtrasForEpisode } from "@/lib/interactiveExtras";
import { listShotlistSuggestions } from "@/lib/showShotlistSuggestions";
import { listDerivedShortDrafts } from "@/lib/showShortDrafts";
import { listShowScenes } from "@/lib/showScenes";
import { findShowProjectWithOwnerBySlug, getShowProjectAccessForUser } from "@/lib/showProjects";
import { getShowEpisodePublishQc } from "@/lib/studioPublishQc";
import InteractiveExtrasEditor from "../../../components/InteractiveExtrasEditor";
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

  const [scenes, shortDrafts, shotlistSuggestions, interactiveExtras, episodeQc] = await Promise.all([
    listShowScenes(episode.id),
    listDerivedShortDrafts(episode.id),
    listShotlistSuggestions(episode.id),
    listInteractiveExtrasForEpisode(episode.id),
    getShowEpisodePublishQc(episode.id)
  ]);
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
  const serializedShotlistSuggestions = shotlistSuggestions.map((suggestion) => ({
    ...suggestion,
    createdAt: suggestion.createdAt.toISOString(),
    updatedAt: suggestion.updatedAt.toISOString()
  }));
  const serializedInteractiveExtras = interactiveExtras.map((extra) => ({
    ...extra,
    createdAt: extra.createdAt.toISOString(),
    updatedAt: extra.updatedAt.toISOString()
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
        initialPublishQc={episodeQc}
        initialScenes={serializedScenes}
        initialShortDrafts={serializedShortDrafts}
        initialShotlistSuggestions={serializedShotlistSuggestions}
        permissions={access.permissions}
      />
      <InteractiveExtrasEditor
        scope={{ kind: "episode", episodeId: episode.id }}
        title="Episode-level prompts and callouts"
        description="Author lightweight interactions that appear directly below playback on the Watch episode page."
        initialExtras={serializedInteractiveExtras}
        permissions={access.permissions}
      />
    </div>
  );
}
