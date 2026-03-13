"use client";

import { type FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ProjectRecord = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  format: "SERIES" | "MOVIE";
  status: "DRAFT" | "IN_PRODUCTION" | "READY_TO_PUBLISH" | "PUBLISHED";
  publishedAt: string | null;
  visibility: "PUBLIC" | "PRIVATE" | "UNLISTED";
  allowedRegions: string[] | null;
  requiresEntitlement: boolean;
  premiereType: "IMMEDIATE" | "SCHEDULED";
  releaseAt: string | null;
  ownerId: string;
  ownerName: string | null;
  ownerEmail: string | null;
  posterImageUrl: string | null;
  bannerImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

type EpisodeRecord = {
  id: string;
  showProjectId: string;
  seasonNumber: number | null;
  episodeNumber: number | null;
  title: string;
  slug: string;
  synopsis: string | null;
  runtimeSeconds: number | null;
  status: "DRAFT" | "READY" | "PUBLISHED";
  publishedAt: string | null;
  visibility: "PUBLIC" | "PRIVATE" | "UNLISTED";
  allowedRegions: string[] | null;
  requiresEntitlement: boolean;
  premiereType: "IMMEDIATE" | "SCHEDULED";
  releaseAt: string | null;
  isPremiereEnabled: boolean;
  premiereStartsAt: string | null;
  premiereEndsAt: string | null;
  chatEnabled: boolean;
  templateType: "STANDARD_EPISODE" | "COLD_OPEN_EPISODE" | "MOVIE_CHAPTER";
  createdAt: string;
  updatedAt: string;
};

type ShowExtraRecord = {
  id: string;
  showProjectId: string;
  type: "BEHIND_THE_SCENES" | "COMMENTARY" | "BONUS_CLIP" | "TRAILER";
  title: string;
  description: string | null;
  assetUrl: string;
  runtimeSeconds: number | null;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string | null;
  premiereType: "IMMEDIATE" | "SCHEDULED";
  releaseAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type CollaboratorRecord = {
  id: string;
  showProjectId: string;
  userId: string;
  role: "OWNER" | "EDITOR" | "WRITER" | "PRODUCER" | "VIEWER";
  name: string | null;
  email: string;
  createdAt: string;
  updatedAt: string;
};

type ShowProjectPermissions = {
  read: boolean;
  editProject: boolean;
  editEpisodes: boolean;
  editScenes: boolean;
  editExtras: boolean;
  publish: boolean;
  manageCollaborators: boolean;
};

type RightsFormState = {
  visibility: "PUBLIC" | "PRIVATE" | "UNLISTED";
  allowedRegions: string;
  requiresEntitlement: boolean;
};

type PublishFormState = RightsFormState & {
  premiereType: "IMMEDIATE" | "SCHEDULED";
  releaseAt: string;
};

type EpisodePublishFormState = PublishFormState & {
  isPremiereEnabled: boolean;
  premiereStartsAt: string;
  premiereEndsAt: string;
  chatEnabled: boolean;
};

type ExtraFormState = {
  type: ShowExtraRecord["type"];
  title: string;
  description: string;
  assetUrl: string;
  runtimeSeconds: string;
  status: ShowExtraRecord["status"];
  premiereType: PublishFormState["premiereType"];
  releaseAt: string;
};

type Props = {
  project: ProjectRecord;
  initialEpisodes: EpisodeRecord[];
  initialExtras: ShowExtraRecord[];
  collaborators: CollaboratorRecord[];
  currentUserRole: CollaboratorRecord["role"] | null;
  permissions: ShowProjectPermissions;
};

const templateOptions: Array<{
  value: EpisodeRecord["templateType"];
  label: string;
  description: string;
}> = [
  {
    value: "STANDARD_EPISODE",
    label: "Standard Episode",
    description: "Classic episodic structure with an opening hook, story beats, and a closing turn."
  },
  {
    value: "COLD_OPEN_EPISODE",
    label: "Cold Open Episode",
    description: "Built for a hard hook before the main story settles into the act structure."
  },
  {
    value: "MOVIE_CHAPTER",
    label: "Movie Chapter",
    description: "Chapter-based pacing for feature or long-form narrative segments."
  }
];

const extraTypeOptions: Array<{
  value: ShowExtraRecord["type"];
  label: string;
  description: string;
}> = [
  {
    value: "BEHIND_THE_SCENES",
    label: "Behind the Scenes",
    description: "Production notes, making-of footage, or set diaries."
  },
  {
    value: "COMMENTARY",
    label: "Commentary",
    description: "Creator or cast walk-throughs layered on top of a clip."
  },
  {
    value: "BONUS_CLIP",
    label: "Bonus Clip",
    description: "Short companion footage, deleted moments, or extended cuts."
  },
  {
    value: "TRAILER",
    label: "Trailer",
    description: "Marketing preview or teaser tied to the show release."
  }
];

const statusLabel: Record<EpisodeRecord["status"], string> = {
  DRAFT: "Draft",
  READY: "Ready",
  PUBLISHED: "Published"
};

const collaboratorRoleLabel: Record<CollaboratorRecord["role"], string> = {
  OWNER: "Owner",
  EDITOR: "Editor",
  WRITER: "Writer",
  PRODUCER: "Producer",
  VIEWER: "Viewer"
};

function formatTemplate(templateType: EpisodeRecord["templateType"]) {
  return templateOptions.find((option) => option.value === templateType)?.label ?? templateType;
}

function formatExtraType(type: ShowExtraRecord["type"]) {
  return extraTypeOptions.find((option) => option.value === type)?.label ?? type;
}

function formatRuntime(runtimeSeconds: number | null) {
  if (!runtimeSeconds) {
    return "Runtime TBD";
  }
  const minutes = Math.floor(runtimeSeconds / 60);
  const seconds = runtimeSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function formatEpisodeCode(episode: EpisodeRecord, format: ProjectRecord["format"]) {
  if (format === "MOVIE" || episode.templateType === "MOVIE_CHAPTER") {
    return episode.episodeNumber ? `Chapter ${episode.episodeNumber}` : "Chapter draft";
  }
  if (episode.seasonNumber && episode.episodeNumber) {
    return `S${episode.seasonNumber}E${episode.episodeNumber}`;
  }
  if (episode.episodeNumber) {
    return `Episode ${episode.episodeNumber}`;
  }
  return "Unnumbered";
}

function toLocalDateTimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function toUtcIsoFromLocalDateTime(value: string) {
  if (!value) return null;
  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) return null;
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const local = new Date(year, (month ?? 1) - 1, day ?? 1, hour ?? 0, minute ?? 0, 0, 0);
  return Number.isNaN(local.getTime()) ? null : local.toISOString();
}

function formatAllowedRegions(value: string[] | null | undefined) {
  return (value ?? []).join(", ");
}

function parseAllowedRegions(value: string) {
  const regions = Array.from(
    new Set(
      value
        .split(",")
        .map((region) => region.trim().toUpperCase())
        .filter(Boolean)
    )
  );

  return regions.length > 0 ? regions : null;
}

function createPublishFormState(
  record: {
    visibility: RightsFormState["visibility"];
    allowedRegions: string[] | null;
    requiresEntitlement: boolean;
    premiereType: "IMMEDIATE" | "SCHEDULED";
    releaseAt: string | null;
  }
) {
  return {
    visibility: record.visibility,
    allowedRegions: formatAllowedRegions(record.allowedRegions),
    requiresEntitlement: record.requiresEntitlement,
    premiereType: record.premiereType,
    releaseAt: toLocalDateTimeInput(record.releaseAt)
  } satisfies PublishFormState;
}

function createEpisodePublishFormState(
  record: Pick<
    EpisodeRecord,
    | "visibility"
    | "allowedRegions"
    | "requiresEntitlement"
    | "premiereType"
    | "releaseAt"
    | "isPremiereEnabled"
    | "premiereStartsAt"
    | "premiereEndsAt"
    | "chatEnabled"
  >
) {
  return {
    visibility: record.visibility,
    allowedRegions: formatAllowedRegions(record.allowedRegions),
    requiresEntitlement: record.requiresEntitlement,
    premiereType: record.premiereType,
    releaseAt: toLocalDateTimeInput(record.releaseAt),
    isPremiereEnabled: record.isPremiereEnabled,
    premiereStartsAt: toLocalDateTimeInput(record.premiereStartsAt),
    premiereEndsAt: toLocalDateTimeInput(record.premiereEndsAt),
    chatEnabled: record.chatEnabled
  } satisfies EpisodePublishFormState;
}

function createExtraFormState(extra?: ShowExtraRecord) {
  return {
    type: extra?.type ?? "BEHIND_THE_SCENES",
    title: extra?.title ?? "",
    description: extra?.description ?? "",
    assetUrl: extra?.assetUrl ?? "",
    runtimeSeconds: extra?.runtimeSeconds ? String(extra.runtimeSeconds) : "",
    status: extra?.status ?? "DRAFT",
    premiereType: extra?.premiereType ?? "IMMEDIATE",
    releaseAt: toLocalDateTimeInput(extra?.releaseAt ?? null)
  } satisfies ExtraFormState;
}

function formatReleaseState(record: { premiereType: "IMMEDIATE" | "SCHEDULED"; releaseAt: string | null }) {
  if (record.premiereType === "SCHEDULED" && record.releaseAt) {
    return `Scheduled for ${new Date(record.releaseAt).toLocaleString()}`;
  }
  return "Immediate release";
}

function formatEpisodePremiereState(record: {
  isPremiereEnabled: boolean;
  premiereStartsAt: string | null;
  premiereEndsAt: string | null;
  chatEnabled: boolean;
}) {
  if (!record.isPremiereEnabled || !record.premiereStartsAt) {
    return "Premiere shell disabled";
  }

  const startText = new Date(record.premiereStartsAt).toLocaleString();
  const endText = record.premiereEndsAt ? ` until ${new Date(record.premiereEndsAt).toLocaleString()}` : "";
  const chatText = record.chatEnabled ? " · Party chat link enabled" : " · Chat stub hidden";
  return `Premiere starts ${startText}${endText}${chatText}`;
}

function buildExtraPayload(form: ExtraFormState) {
  return {
    type: form.type,
    title: form.title,
    description: form.description.trim() ? form.description.trim() : null,
    assetUrl: form.assetUrl,
    runtimeSeconds: form.runtimeSeconds.trim() ? Number(form.runtimeSeconds) : null,
    status: form.status,
    premiereType: form.premiereType,
    releaseAt: form.premiereType === "SCHEDULED" ? toUtcIsoFromLocalDateTime(form.releaseAt) : null
  };
}

function formatRightsSummary(record: {
  visibility: RightsFormState["visibility"];
  allowedRegions: string[] | null;
  requiresEntitlement: boolean;
}) {
  const regions = record.allowedRegions?.length ? record.allowedRegions.join(", ") : "All regions";
  const entitlement = record.requiresEntitlement ? "Entitlement required" : "No entitlement gate";
  return `${record.visibility} · ${regions} · ${entitlement}`;
}

export default function ShowProjectEpisodesManager({
  project,
  initialEpisodes,
  initialExtras,
  collaborators: initialCollaborators,
  currentUserRole,
  permissions
}: Props) {
  const router = useRouter();
  const [projectState, setProjectState] = useState(project);
  const [episodes, setEpisodes] = useState(initialEpisodes);
  const [extras, setExtras] = useState(initialExtras);
  const [collaborators, setCollaborators] = useState(initialCollaborators);
  const [projectPublishForm, setProjectPublishForm] = useState<PublishFormState>(() => createPublishFormState(project));
  const [episodePublishForms, setEpisodePublishForms] = useState<Record<string, EpisodePublishFormState>>(() =>
    Object.fromEntries(initialEpisodes.map((episode) => [episode.id, createEpisodePublishFormState(episode)]))
  );
  const [extraForms, setExtraForms] = useState<Record<string, ExtraFormState>>(() =>
    Object.fromEntries(initialExtras.map((extra) => [extra.id, createExtraFormState(extra)]))
  );
  const [newExtraForm, setNewExtraForm] = useState<ExtraFormState>(() => createExtraFormState());
  const availableTemplateOptions = templateOptions.filter((option) =>
    projectState.format === "MOVIE" ? option.value === "MOVIE_CHAPTER" : option.value !== "MOVIE_CHAPTER"
  );
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isExtraComposerOpen, setIsExtraComposerOpen] = useState(false);
  const [templateType, setTemplateType] = useState<EpisodeRecord["templateType"]>(
    projectState.format === "MOVIE" ? "MOVIE_CHAPTER" : "STANDARD_EPISODE"
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [publishTarget, setPublishTarget] = useState<string | null>(null);
  const [extraSaveTarget, setExtraSaveTarget] = useState<string | null>(null);
  const [collaboratorEmail, setCollaboratorEmail] = useState("");
  const [collaboratorRole, setCollaboratorRole] = useState<CollaboratorRecord["role"]>("VIEWER");
  const [collaboratorTarget, setCollaboratorTarget] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canPublish = permissions.publish;
  const canEditEpisodes = permissions.editEpisodes;
  const canEditExtras = permissions.editExtras;
  const canManageCollaborators = permissions.manageCollaborators;

  async function handleCreateEpisode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const response = await fetch(`/api/studio/show-projects/${projectState.slug}/episodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateType })
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Unable to create episode.");
      return;
    }

    setIsComposerOpen(false);
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleCreateExtra(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setExtraSaveTarget("new");

    const response = await fetch(`/api/studio/show-projects/${projectState.slug}/extras`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildExtraPayload(newExtraForm))
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string; extra?: ShowExtraRecord };
    setExtraSaveTarget(null);

    if (!response.ok || !payload.extra) {
      setError(payload.error ?? "Unable to create extra.");
      return;
    }

    const createdExtra = payload.extra;

    setExtras((current) => [createdExtra, ...current]);
    setExtraForms((current) => ({
      ...current,
      [createdExtra.id]: createExtraFormState(createdExtra)
    }));
    setNewExtraForm(createExtraFormState());
    setIsExtraComposerOpen(false);
    setNotice(`Extra saved for Watch: ${createdExtra.title}`);
    startTransition(() => {
      router.refresh();
    });
  }

  function buildPublishPayload(form: PublishFormState) {
    const releaseAt = form.premiereType === "SCHEDULED" ? toUtcIsoFromLocalDateTime(form.releaseAt) : null;
    return {
      visibility: form.visibility,
      allowedRegions: parseAllowedRegions(form.allowedRegions),
      requiresEntitlement: form.requiresEntitlement,
      premiereType: form.premiereType,
      releaseAt
    };
  }

  function buildEpisodePublishPayload(form: EpisodePublishFormState) {
    const releaseAt = form.premiereType === "SCHEDULED" ? toUtcIsoFromLocalDateTime(form.releaseAt) : null;
    const premiereStartsAt = form.isPremiereEnabled ? toUtcIsoFromLocalDateTime(form.premiereStartsAt) : null;
    const premiereEndsAt = form.isPremiereEnabled ? toUtcIsoFromLocalDateTime(form.premiereEndsAt) : null;

    return {
      visibility: form.visibility,
      allowedRegions: parseAllowedRegions(form.allowedRegions),
      requiresEntitlement: form.requiresEntitlement,
      premiereType: form.isPremiereEnabled ? "SCHEDULED" : form.premiereType,
      releaseAt: form.isPremiereEnabled ? premiereStartsAt : releaseAt,
      isPremiereEnabled: form.isPremiereEnabled,
      premiereStartsAt,
      premiereEndsAt,
      chatEnabled: form.isPremiereEnabled ? form.chatEnabled : false
    };
  }

  async function handlePublishProject() {
    setPublishTarget("project");
    setError(null);
    setNotice(null);

    const response = await fetch(`/api/studio/show-projects/${projectState.slug}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPublishPayload(projectPublishForm))
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      project?: ProjectRecord;
      watchShow?: { slug: string };
    };

    setPublishTarget(null);

    if (!response.ok || !payload.project) {
      setError(payload.error ?? "Unable to publish show.");
      return;
    }

    setProjectState(payload.project);
    setProjectPublishForm(createPublishFormState(payload.project));
    setNotice(
      payload.project.premiereType === "SCHEDULED"
        ? `Scheduled Watch premiere: /watch/show/${payload.watchShow?.slug ?? payload.project.slug}`
        : `Published to Watch: /watch/show/${payload.watchShow?.slug ?? payload.project.slug}`
    );
    startTransition(() => {
      router.refresh();
    });
  }

  async function handlePublishEpisode(episodeId: string) {
    setPublishTarget(episodeId);
    setError(null);
    setNotice(null);

    const response = await fetch(`/api/studio/episodes/${episodeId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        buildEpisodePublishPayload(
          episodePublishForms[episodeId] ??
            createEpisodePublishFormState({
              visibility: "PUBLIC",
              allowedRegions: null,
              requiresEntitlement: false,
              premiereType: "IMMEDIATE",
              releaseAt: null,
              isPremiereEnabled: false,
              premiereStartsAt: null,
              premiereEndsAt: null,
              chatEnabled: false
            })
        )
      )
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      project?: ProjectRecord;
      episode?: EpisodeRecord;
      watchShow?: { slug: string };
      watchEpisode?: { id: string };
    };

    setPublishTarget(null);

    if (!response.ok || !payload.project || !payload.episode) {
      setError(payload.error ?? "Unable to publish episode.");
      return;
    }

    const publishedEpisode = payload.episode;
    setProjectState(payload.project);
    setProjectPublishForm(createPublishFormState(payload.project));
    setEpisodes((current) =>
      current.map((episode) => (episode.id === publishedEpisode.id ? publishedEpisode : episode))
    );
    setEpisodePublishForms((current) => ({
      ...current,
      [publishedEpisode.id]: createEpisodePublishFormState(publishedEpisode)
    }));
    setNotice(
      publishedEpisode.premiereType === "SCHEDULED"
        ? `Scheduled Watch premiere: /watch/show/${payload.watchShow?.slug ?? payload.project.slug} · episode ${payload.watchEpisode?.id ?? publishedEpisode.id}`
        : `Published to Watch: /watch/show/${payload.watchShow?.slug ?? payload.project.slug} · episode ${payload.watchEpisode?.id ?? publishedEpisode.id}`
    );
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleSaveExtra(extraId: string) {
    setExtraSaveTarget(extraId);
    setError(null);
    setNotice(null);

    const response = await fetch(`/api/studio/extras/${extraId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildExtraPayload(extraForms[extraId] ?? createExtraFormState()))
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; extra?: ShowExtraRecord };

    setExtraSaveTarget(null);

    if (!response.ok || !payload.extra) {
      setError(payload.error ?? "Unable to save extra.");
      return;
    }

    const savedExtra = payload.extra;

    setExtras((current) => current.map((extra) => (extra.id === savedExtra.id ? savedExtra : extra)));
    setExtraForms((current) => ({
      ...current,
      [savedExtra.id]: createExtraFormState(savedExtra)
    }));
    setNotice(
      savedExtra.status === "PUBLISHED"
        ? `Extra is live on Watch when the release window opens: ${savedExtra.title}`
        : `Saved draft extra: ${savedExtra.title}`
    );
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleAddCollaborator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCollaboratorTarget("new");
    setError(null);
    setNotice(null);

    const response = await fetch(`/api/studio/show-projects/${projectState.slug}/collaborators`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: collaboratorEmail,
        role: collaboratorRole
      })
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      collaborator?: CollaboratorRecord;
    };

    setCollaboratorTarget(null);

    if (!response.ok || !payload.collaborator) {
      setError(payload.error ?? "Unable to add collaborator.");
      return;
    }

    const collaborator = payload.collaborator;
    setCollaborators((current) => {
      const next = current.filter((entry) => entry.id !== collaborator.id);
      return [...next, collaborator].sort((left, right) => left.email.localeCompare(right.email));
    });
    setCollaboratorEmail("");
    setCollaboratorRole("VIEWER");
    setNotice(`Collaborator access saved for ${collaborator.email}.`);
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleUpdateCollaboratorRole(collaboratorId: string, role: CollaboratorRecord["role"]) {
    setCollaboratorTarget(collaboratorId);
    setError(null);
    setNotice(null);

    const response = await fetch(`/api/studio/show-projects/${projectState.slug}/collaborators/${collaboratorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role })
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      collaborator?: CollaboratorRecord;
    };

    setCollaboratorTarget(null);

    if (!response.ok || !payload.collaborator) {
      setError(payload.error ?? "Unable to update collaborator.");
      return;
    }

    setCollaborators((current) =>
      current.map((entry) => (entry.id === payload.collaborator?.id ? payload.collaborator : entry))
    );
    setNotice(`Updated ${payload.collaborator.email} to ${collaboratorRoleLabel[payload.collaborator.role]}.`);
  }

  async function handleRemoveCollaborator(collaboratorId: string) {
    setCollaboratorTarget(collaboratorId);
    setError(null);
    setNotice(null);

    const response = await fetch(`/api/studio/show-projects/${projectState.slug}/collaborators/${collaboratorId}`, {
      method: "DELETE"
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      collaborator?: CollaboratorRecord;
    };

    setCollaboratorTarget(null);

    if (!response.ok || !payload.collaborator) {
      setError(payload.error ?? "Unable to remove collaborator.");
      return;
    }

    setCollaborators((current) => current.filter((entry) => entry.id !== collaboratorId));
    setNotice(`Removed ${payload.collaborator.email} from this show project.`);
  }

  return (
    <div className="space-y-4">
      <section className="party-card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">{projectState.format} Project</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{projectState.title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-white/75">
              {projectState.description || "No description yet."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handlePublishProject}
              disabled={!canPublish || publishTarget !== null}
              className="interactive-focus rounded-full border border-cyan-300/40 bg-cyan-300/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100 disabled:opacity-50"
            >
              {publishTarget === "project" ? "Publishing" : "Publish to Watch"}
            </button>
            <button
              type="button"
              onClick={() => setIsExtraComposerOpen((current) => !current)}
              disabled={!canEditExtras}
              className="interactive-focus rounded-full border border-white/15 bg-white/5 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-white"
            >
              Add Extra
            </button>
            <button
              type="button"
              onClick={() => setIsComposerOpen((current) => !current)}
              disabled={!canEditEpisodes}
              className="interactive-focus rounded-full bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-slate-950"
            >
              Create Episode
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Status</p>
            <p className="mt-2 text-lg font-semibold text-white">{projectState.status}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Episodes</p>
            <p className="mt-2 text-lg font-semibold text-white">{episodes.length}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Extras</p>
            <p className="mt-2 text-lg font-semibold text-white">{extras.length}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Owner</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {projectState.ownerName || projectState.ownerEmail || projectState.ownerId}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/45">
              Your role: {currentUserRole ? collaboratorRoleLabel[currentUserRole] : "Admin"}
            </p>
          </div>
        </div>

        <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-illuvrse-muted">Collaborators</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Project access</h2>
              <p className="mt-2 text-sm text-white/70">
                Owners can manage collaborators. Editors can edit and publish. Writers can work on episodes and scenes.
                Producers can manage release-facing project work. Viewers are read-only.
              </p>
            </div>
            <p className="text-sm text-white/55">{collaborators.length + 1} people with access</p>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <article className="rounded-[24px] border border-cyan-300/20 bg-cyan-400/5 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">Project Owner</p>
              <h3 className="mt-2 text-lg font-semibold text-white">
                {projectState.ownerName || projectState.ownerEmail || projectState.ownerId}
              </h3>
              <p className="mt-2 text-sm text-white/70">{projectState.ownerEmail || "Owner email unavailable"}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-white/45">Owner access cannot be removed here.</p>
            </article>
            {collaborators.map((collaborator) => (
              <article key={collaborator.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-white/55">Collaborator</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">
                      {collaborator.name || collaborator.email}
                    </h3>
                    <p className="mt-2 text-sm text-white/70">{collaborator.email}</p>
                  </div>
                  {canManageCollaborators ? (
                    <select
                      value={collaborator.role}
                      onChange={(event) =>
                        handleUpdateCollaboratorRole(
                          collaborator.id,
                          event.target.value as CollaboratorRecord["role"]
                        )
                      }
                      disabled={collaboratorTarget === collaborator.id}
                      className="rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white disabled:opacity-50"
                    >
                      <option value="OWNER">Owner</option>
                      <option value="EDITOR">Editor</option>
                      <option value="WRITER">Writer</option>
                      <option value="PRODUCER">Producer</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  ) : (
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/75">
                      {collaboratorRoleLabel[collaborator.role]}
                    </span>
                  )}
                </div>
                {canManageCollaborators ? (
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveCollaborator(collaborator.id)}
                      disabled={collaboratorTarget === collaborator.id}
                      className="interactive-focus rounded-full border border-rose-300/30 bg-rose-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-100 disabled:opacity-50"
                    >
                      {collaboratorTarget === collaborator.id ? "Saving" : "Remove"}
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          {canManageCollaborators ? (
            <form onSubmit={handleAddCollaborator} className="mt-4 grid gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4 md:grid-cols-[1.4fr_0.8fr_auto]">
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.22em] text-white/60">User Email</span>
                <input
                  type="email"
                  required
                  value={collaboratorEmail}
                  onChange={(event) => setCollaboratorEmail(event.target.value)}
                  className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white"
                  placeholder="creator@illuvrse.com"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.22em] text-white/60">Role</span>
                <select
                  value={collaboratorRole}
                  onChange={(event) => setCollaboratorRole(event.target.value as CollaboratorRecord["role"])}
                  className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white"
                >
                  <option value="OWNER">Owner</option>
                  <option value="EDITOR">Editor</option>
                  <option value="WRITER">Writer</option>
                  <option value="PRODUCER">Producer</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={collaboratorTarget === "new"}
                  className="interactive-focus rounded-full bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-slate-950 disabled:opacity-50"
                >
                  {collaboratorTarget === "new" ? "Saving" : "Add Collaborator"}
                </button>
              </div>
            </form>
          ) : (
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-white/45">
              You can view collaborators, but only owners can change project access.
            </p>
          )}
        </section>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Updated</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {new Date(projectState.updatedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Published</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {projectState.publishedAt ? new Date(projectState.publishedAt).toLocaleDateString() : "Not published"}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/45">
              {formatReleaseState(projectState)}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-cyan-100/70">
              {formatRightsSummary(projectState)}
            </p>
          </div>
        </div>

        <div className="grid gap-3 rounded-[24px] border border-white/10 bg-white/5 p-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.24em] text-white/70">Visibility</span>
            <select
              value={projectPublishForm.visibility}
              onChange={(event) =>
                setProjectPublishForm((current) => ({
                  ...current,
                  visibility: event.target.value as RightsFormState["visibility"]
                }))
              }
              disabled={!canPublish}
              className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white"
            >
              <option value="PUBLIC">Public</option>
              <option value="UNLISTED">Unlisted</option>
              <option value="PRIVATE">Private</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.24em] text-white/70">Allowed Regions</span>
            <input
              value={projectPublishForm.allowedRegions}
              onChange={(event) =>
                setProjectPublishForm((current) => ({
                  ...current,
                  allowedRegions: event.target.value
                }))
              }
              disabled={!canPublish}
              className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white"
              placeholder="US, CA, GB"
            />
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white md:col-span-2">
            <input
              type="checkbox"
              checked={projectPublishForm.requiresEntitlement}
              onChange={(event) =>
                setProjectPublishForm((current) => ({
                  ...current,
                  requiresEntitlement: event.target.checked
                }))
              }
              disabled={!canPublish}
            />
            Require a matching Watch entitlement key before playback
          </label>
        </div>

        <div className="grid gap-3 rounded-[24px] border border-white/10 bg-white/5 p-4 md:grid-cols-[1fr_1fr_auto]">
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.24em] text-white/70">Show Premiere</span>
            <select
              value={projectPublishForm.premiereType}
              onChange={(event) =>
                setProjectPublishForm((current) => ({
                  ...current,
                  premiereType: event.target.value as PublishFormState["premiereType"]
                }))
              }
              disabled={!canPublish}
              className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white"
            >
              <option value="IMMEDIATE">Publish immediately</option>
              <option value="SCHEDULED">Schedule premiere</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.24em] text-white/70">Release Time</span>
            <input
              type="datetime-local"
              value={projectPublishForm.releaseAt}
              onChange={(event) =>
                setProjectPublishForm((current) => ({
                  ...current,
                  releaseAt: event.target.value
                }))
              }
              disabled={!canPublish || projectPublishForm.premiereType !== "SCHEDULED"}
              className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
          <div className="flex items-end">
            <p className="text-xs text-white/55">Region list is metadata-only. Leave blank for all regions.</p>
          </div>
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}

        {isExtraComposerOpen ? (
          <form onSubmit={handleCreateExtra} className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-illuvrse-muted">New Extra</p>
                <h2 className="mt-1 text-xl font-semibold text-white">Attach a bonus asset</h2>
              </div>
              <p className="max-w-xl text-sm text-illuvrse-muted">
                Extras are metadata-only. Paste a playable asset URL and choose when it should surface on Watch.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              {extraTypeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-[24px] border p-4 transition ${
                    newExtraForm.type === option.value
                      ? "border-cyan-300/60 bg-cyan-400/10"
                      : "border-white/10 bg-slate-950/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="extraType"
                    value={option.value}
                    checked={newExtraForm.type === option.value}
                    onChange={() => setNewExtraForm((current) => ({ ...current, type: option.value }))}
                    disabled={!canEditExtras}
                    className="sr-only"
                  />
                  <p className="text-sm font-semibold text-white">{option.label}</p>
                  <p className="mt-2 text-sm text-white/70">{option.description}</p>
                </label>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.22em] text-white/60">Title</span>
                <input
                  value={newExtraForm.title}
                  onChange={(event) => setNewExtraForm((current) => ({ ...current, title: event.target.value }))}
                  disabled={!canEditExtras}
                  className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white"
                  placeholder="Creator commentary cut"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.22em] text-white/60">Asset URL</span>
                <input
                  value={newExtraForm.assetUrl}
                  onChange={(event) => setNewExtraForm((current) => ({ ...current, assetUrl: event.target.value }))}
                  disabled={!canEditExtras}
                  className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white"
                  placeholder="https://cdn.example.com/show-extra.mp4"
                />
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.22em] text-white/60">Description</span>
              <textarea
                value={newExtraForm.description}
                onChange={(event) => setNewExtraForm((current) => ({ ...current, description: event.target.value }))}
                disabled={!canEditExtras}
                className="min-h-28 w-full rounded-3xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white"
                placeholder="Optional context for why this extra matters."
              />
            </label>

            <div className="grid gap-3 md:grid-cols-4">
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.22em] text-white/60">Runtime Seconds</span>
                <input
                  type="number"
                  min={1}
                  value={newExtraForm.runtimeSeconds}
                  onChange={(event) =>
                    setNewExtraForm((current) => ({ ...current, runtimeSeconds: event.target.value }))
                  }
                  disabled={!canEditExtras}
                  className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white"
                  placeholder="180"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.22em] text-white/60">Status</span>
                <select
                  value={newExtraForm.status}
                  onChange={(event) =>
                    setNewExtraForm((current) => ({
                      ...current,
                      status: event.target.value as ShowExtraRecord["status"]
                    }))
                  }
                  disabled={!canEditExtras}
                  className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.22em] text-white/60">Premiere</span>
                <select
                  value={newExtraForm.premiereType}
                  onChange={(event) =>
                    setNewExtraForm((current) => ({
                      ...current,
                      premiereType: event.target.value as ExtraFormState["premiereType"]
                    }))
                  }
                  disabled={!canEditExtras}
                  className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white"
                >
                  <option value="IMMEDIATE">Immediate</option>
                  <option value="SCHEDULED">Scheduled</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.22em] text-white/60">Release Time</span>
                <input
                  type="datetime-local"
                  value={newExtraForm.releaseAt}
                  onChange={(event) => setNewExtraForm((current) => ({ ...current, releaseAt: event.target.value }))}
                  disabled={!canEditExtras || newExtraForm.premiereType !== "SCHEDULED"}
                  className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!canEditExtras || extraSaveTarget === "new"}
                className="interactive-focus rounded-full bg-cyan-300 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-slate-950 disabled:opacity-60"
              >
                {extraSaveTarget === "new" ? "Saving" : "Save Extra"}
              </button>
              <button
                type="button"
                onClick={() => setIsExtraComposerOpen(false)}
                className="interactive-focus rounded-full border border-white/15 bg-white/5 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {isComposerOpen ? (
          <form onSubmit={handleCreateEpisode} className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-illuvrse-muted">New Episode</p>
                <h2 className="mt-1 text-xl font-semibold text-white">Choose a template preset</h2>
              </div>
              <p className="max-w-xl text-sm text-illuvrse-muted">
                New items start in draft with a placeholder title and lightweight structure notes.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {availableTemplateOptions.map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-[24px] border p-4 transition ${
                    templateType === option.value
                      ? "border-cyan-300/60 bg-cyan-400/10"
                      : "border-white/10 bg-slate-950/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="templateType"
                    value={option.value}
                    checked={templateType === option.value}
                    onChange={() => setTemplateType(option.value)}
                    disabled={!canEditEpisodes}
                    className="sr-only"
                  />
                  <p className="text-sm font-semibold text-white">{option.label}</p>
                  <p className="mt-2 text-sm text-white/70">{option.description}</p>
                </label>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!canEditEpisodes || isPending}
                className="interactive-focus rounded-full bg-cyan-300 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-slate-950 disabled:opacity-60"
              >
                {isPending ? "Creating" : "Create Episode"}
              </button>
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className="interactive-focus rounded-full border border-white/15 bg-white/5 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="party-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Episode Library</p>
            <h2 className="text-xl font-semibold">Project episodes</h2>
          </div>
          <p className="text-sm text-illuvrse-muted">
            {projectState.format === "MOVIE" ? "Chapters and sequence drafts" : "Episodes ready for story development"}
          </p>
        </div>

        {episodes.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-illuvrse-muted">
            No episodes yet. Create the first one to seed structure notes and start the release pipeline draft.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {episodes.map((episode) => (
              <article key={episode.id} className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/80">
                      {formatEpisodeCode(episode, projectState.format)}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{episode.title}</h3>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/75">
                    {statusLabel[episode.status]}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.22em] text-white/50">
                  <span>{formatTemplate(episode.templateType)}</span>
                  <span>{formatRuntime(episode.runtimeSeconds)}</span>
                  <span>{episode.slug}</span>
                </div>

                <p className="mt-4 text-sm text-white/70">{episode.synopsis || "No structure notes yet."}</p>

                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-white/45">
                  {episode.publishedAt
                    ? `Published ${new Date(episode.publishedAt).toLocaleDateString()}`
                    : "Not published"}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-cyan-100/70">
                  {formatRightsSummary(episode)}
                </p>

                <div className="mt-4 grid gap-3 rounded-[24px] border border-white/10 bg-black/20 p-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-[11px] uppercase tracking-[0.22em] text-white/55">Visibility</span>
                      <select
                        value={(episodePublishForms[episode.id] ?? createEpisodePublishFormState(episode)).visibility}
                        onChange={(event) =>
                          setEpisodePublishForms((current) => ({
                            ...current,
                            [episode.id]: {
                              ...(current[episode.id] ?? createEpisodePublishFormState(episode)),
                              visibility: event.target.value as RightsFormState["visibility"]
                            }
                          }))
                        }
                        disabled={!canPublish}
                        className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white"
                      >
                        <option value="PUBLIC">Public</option>
                        <option value="UNLISTED">Unlisted</option>
                        <option value="PRIVATE">Private</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-[11px] uppercase tracking-[0.22em] text-white/55">Allowed Regions</span>
                      <input
                        value={(episodePublishForms[episode.id] ?? createEpisodePublishFormState(episode)).allowedRegions}
                        onChange={(event) =>
                          setEpisodePublishForms((current) => ({
                            ...current,
                            [episode.id]: {
                              ...(current[episode.id] ?? createEpisodePublishFormState(episode)),
                              allowedRegions: event.target.value
                            }
                          }))
                        }
                        disabled={!canPublish}
                        className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white"
                        placeholder="US, CA, GB"
                      />
                    </label>
                  </div>
                  <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
                    <input
                      type="checkbox"
                      checked={(episodePublishForms[episode.id] ?? createEpisodePublishFormState(episode)).requiresEntitlement}
                      onChange={(event) =>
                        setEpisodePublishForms((current) => ({
                          ...current,
                          [episode.id]: {
                            ...(current[episode.id] ?? createEpisodePublishFormState(episode)),
                            requiresEntitlement: event.target.checked
                          }
                        }))
                      }
                      disabled={!canPublish}
                    />
                    Require a matching Watch entitlement before playback
                  </label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-[11px] uppercase tracking-[0.22em] text-white/55">Premiere</span>
                      <select
                        value={(episodePublishForms[episode.id] ?? createEpisodePublishFormState(episode)).premiereType}
                        onChange={(event) =>
                          setEpisodePublishForms((current) => ({
                            ...current,
                            [episode.id]: {
                              ...(current[episode.id] ?? createEpisodePublishFormState(episode)),
                              premiereType: event.target.value as PublishFormState["premiereType"]
                            }
                          }))
                        }
                        disabled={!canPublish}
                        className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white"
                      >
                        <option value="IMMEDIATE">Immediate</option>
                        <option value="SCHEDULED">Scheduled</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-[11px] uppercase tracking-[0.22em] text-white/55">Release Time</span>
                      <input
                        type="datetime-local"
                        value={(episodePublishForms[episode.id] ?? createEpisodePublishFormState(episode)).releaseAt}
                        onChange={(event) =>
                          setEpisodePublishForms((current) => ({
                            ...current,
                            [episode.id]: {
                              ...(current[episode.id] ?? createEpisodePublishFormState(episode)),
                              releaseAt: event.target.value
                            }
                          }))
                        }
                        disabled={
                          !canPublish ||
                          (episodePublishForms[episode.id] ?? createEpisodePublishFormState(episode)).premiereType !==
                          "SCHEDULED"
                        }
                        className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </label>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
                      <input
                        type="checkbox"
                        checked={(episodePublishForms[episode.id] ?? createEpisodePublishFormState(episode)).isPremiereEnabled}
                        onChange={(event) =>
                          setEpisodePublishForms((current) => ({
                            ...current,
                            [episode.id]: {
                              ...(current[episode.id] ?? createEpisodePublishFormState(episode)),
                              isPremiereEnabled: event.target.checked,
                              premiereType: event.target.checked
                                ? "SCHEDULED"
                                : (current[episode.id] ?? createEpisodePublishFormState(episode)).premiereType
                            }
                          }))
                        }
                        disabled={!canPublish}
                      />
                      Enable live premiere shell on Watch
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
                      <input
                        type="checkbox"
                        checked={(episodePublishForms[episode.id] ?? createEpisodePublishFormState(episode)).chatEnabled}
                        onChange={(event) =>
                          setEpisodePublishForms((current) => ({
                            ...current,
                            [episode.id]: {
                              ...(current[episode.id] ?? createEpisodePublishFormState(episode)),
                              chatEnabled: event.target.checked
                            }
                          }))
                        }
                        disabled={
                          !canPublish ||
                          !(episodePublishForms[episode.id] ?? createEpisodePublishFormState(episode)).isPremiereEnabled
                        }
                      />
                      Show party chat link
                    </label>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-[11px] uppercase tracking-[0.22em] text-white/55">Premiere Starts</span>
                      <input
                        type="datetime-local"
                        value={(episodePublishForms[episode.id] ?? createEpisodePublishFormState(episode)).premiereStartsAt}
                        onChange={(event) =>
                          setEpisodePublishForms((current) => ({
                            ...current,
                            [episode.id]: {
                              ...(current[episode.id] ?? createEpisodePublishFormState(episode)),
                              premiereStartsAt: event.target.value,
                              releaseAt: event.target.value
                            }
                          }))
                        }
                        disabled={
                          !canPublish ||
                          !(episodePublishForms[episode.id] ?? createEpisodePublishFormState(episode)).isPremiereEnabled
                        }
                        className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-[11px] uppercase tracking-[0.22em] text-white/55">
                        Premiere Ends (Optional)
                      </span>
                      <input
                        type="datetime-local"
                        value={(episodePublishForms[episode.id] ?? createEpisodePublishFormState(episode)).premiereEndsAt}
                        onChange={(event) =>
                          setEpisodePublishForms((current) => ({
                            ...current,
                            [episode.id]: {
                              ...(current[episode.id] ?? createEpisodePublishFormState(episode)),
                              premiereEndsAt: event.target.value
                            }
                          }))
                        }
                        disabled={
                          !canPublish ||
                          !(episodePublishForms[episode.id] ?? createEpisodePublishFormState(episode)).isPremiereEnabled
                        }
                        className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </label>
                  </div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">
                    {formatReleaseState(episodePublishForms[episode.id] ?? createEpisodePublishFormState(episode))}
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/70">
                    {formatEpisodePremiereState(episodePublishForms[episode.id] ?? createEpisodePublishFormState(episode))}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handlePublishEpisode(episode.id)}
                    disabled={!canPublish || publishTarget !== null}
                    className="interactive-focus inline-flex rounded-full border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100 disabled:opacity-50"
                  >
                    {publishTarget === episode.id ? "Publishing" : "Publish to Watch"}
                  </button>
                  <Link
                    href={`/studio/show-projects/${projectState.slug}/episodes/${episode.slug}`}
                    className="interactive-focus inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white"
                  >
                    Open Script Editor
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="party-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Extras</p>
            <h2 className="text-xl font-semibold">Published companions and bonus clips</h2>
          </div>
          <p className="text-sm text-illuvrse-muted">Draft here, flip to published when the bonus material is ready.</p>
        </div>

        {extras.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-illuvrse-muted">
            No extras yet. Add a trailer, commentary, or behind-the-scenes clip from the show detail page.
          </div>
        ) : (
          <div className="grid gap-4">
            {extras.map((extra) => {
              const form = extraForms[extra.id] ?? createExtraFormState(extra);

              return (
                <article key={extra.id} className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/80">{formatExtraType(extra.type)}</p>
                      <h3 className="mt-2 text-lg font-semibold text-white">{extra.title}</h3>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/75">
                      {extra.status}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-white/70">{extra.description || "No description yet."}</p>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-[11px] uppercase tracking-[0.22em] text-white/55">Type</span>
                      <select
                        value={form.type}
                        onChange={(event) =>
                          setExtraForms((current) => ({
                            ...current,
                            [extra.id]: {
                              ...form,
                              type: event.target.value as ShowExtraRecord["type"]
                            }
                          }))
                        }
                        disabled={!canEditExtras}
                        className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white"
                      >
                        {extraTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-[11px] uppercase tracking-[0.22em] text-white/55">Title</span>
                      <input
                        value={form.title}
                        onChange={(event) =>
                          setExtraForms((current) => ({
                            ...current,
                            [extra.id]: {
                              ...form,
                              title: event.target.value
                            }
                          }))
                        }
                        disabled={!canEditExtras}
                        className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white"
                      />
                    </label>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-[2fr_1fr]">
                    <label className="space-y-2">
                      <span className="text-[11px] uppercase tracking-[0.22em] text-white/55">Asset URL</span>
                      <input
                        value={form.assetUrl}
                        onChange={(event) =>
                          setExtraForms((current) => ({
                            ...current,
                            [extra.id]: {
                              ...form,
                              assetUrl: event.target.value
                            }
                          }))
                        }
                        disabled={!canEditExtras}
                        className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-[11px] uppercase tracking-[0.22em] text-white/55">Runtime Seconds</span>
                      <input
                        type="number"
                        min={1}
                        value={form.runtimeSeconds}
                        onChange={(event) =>
                          setExtraForms((current) => ({
                            ...current,
                            [extra.id]: {
                              ...form,
                              runtimeSeconds: event.target.value
                            }
                          }))
                        }
                        disabled={!canEditExtras}
                        className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white"
                      />
                    </label>
                  </div>

                  <label className="mt-3 block space-y-2">
                    <span className="text-[11px] uppercase tracking-[0.22em] text-white/55">Description</span>
                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        setExtraForms((current) => ({
                          ...current,
                          [extra.id]: {
                            ...form,
                            description: event.target.value
                          }
                        }))
                      }
                      disabled={!canEditExtras}
                      className="min-h-24 w-full rounded-3xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white"
                    />
                  </label>

                  <div className="mt-4 grid gap-3 rounded-[24px] border border-white/10 bg-black/20 p-3 md:grid-cols-4">
                    <label className="space-y-2">
                      <span className="text-[11px] uppercase tracking-[0.22em] text-white/55">Status</span>
                      <select
                        value={form.status}
                        onChange={(event) =>
                          setExtraForms((current) => ({
                            ...current,
                            [extra.id]: {
                              ...form,
                              status: event.target.value as ShowExtraRecord["status"]
                            }
                          }))
                        }
                        disabled={!canEditExtras}
                        className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white"
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="PUBLISHED">Published</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-[11px] uppercase tracking-[0.22em] text-white/55">Premiere</span>
                      <select
                        value={form.premiereType}
                        onChange={(event) =>
                          setExtraForms((current) => ({
                            ...current,
                            [extra.id]: {
                              ...form,
                              premiereType: event.target.value as ExtraFormState["premiereType"]
                            }
                          }))
                        }
                        disabled={!canEditExtras}
                        className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white"
                      >
                        <option value="IMMEDIATE">Immediate</option>
                        <option value="SCHEDULED">Scheduled</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-[11px] uppercase tracking-[0.22em] text-white/55">Release Time</span>
                      <input
                        type="datetime-local"
                        value={form.releaseAt}
                        onChange={(event) =>
                          setExtraForms((current) => ({
                            ...current,
                            [extra.id]: {
                              ...form,
                              releaseAt: event.target.value
                            }
                          }))
                        }
                        disabled={!canEditExtras || form.premiereType !== "SCHEDULED"}
                        className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </label>
                    <div className="flex flex-col justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveExtra(extra.id)}
                        disabled={!canEditExtras || extraSaveTarget !== null}
                        className="interactive-focus rounded-full border border-cyan-300/40 bg-cyan-300/10 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100 disabled:opacity-50"
                      >
                        {extraSaveTarget === extra.id ? "Saving" : "Save Extra"}
                      </button>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">
                        {formatRuntime(extra.runtimeSeconds)} · {formatReleaseState(extra)}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
