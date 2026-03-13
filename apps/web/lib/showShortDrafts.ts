import { randomUUID } from "node:crypto";
import { prisma } from "@illuvrse/db";
import type { ShowEpisodeRecord } from "@/lib/showEpisodes";
import { listShowScenes, type ShowSceneRecord } from "@/lib/showScenes";

export type DerivedShortDraftRecord = {
  id: string;
  showEpisodeId: string;
  showSceneId: string;
  sourceShowId: string;
  sourceEpisodeId: string;
  sourceSceneId: string | null;
  sourceTimestampSeconds: number | null;
  title: string;
  clipStartSeconds: number;
  clipEndSeconds: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  sourceShowTitle: string;
  sourceEpisodeTitle: string;
  sourceSceneNumber: number;
  sourceSceneTitle: string;
};

type DerivedShortDraftRow = {
  id: string;
  showEpisodeId: string;
  showSceneId: string;
  sourceShowId: string;
  sourceEpisodeId: string;
  sourceSceneId: string | null;
  sourceTimestampSeconds: number | null;
  title: string;
  clipStartSeconds: number;
  clipEndSeconds: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  sourceShowTitle: string;
  sourceEpisodeTitle: string;
  sourceSceneNumber: number;
  sourceSceneTitle: string;
};

type GeneratedDraftCounts = {
  created: number;
  updated: number;
  total: number;
};

function buildDraftTitle(episode: ShowEpisodeRecord, scene: ShowSceneRecord) {
  const sceneLabel = scene.title.trim() || `Scene ${scene.sceneNumber}`;
  return `${episode.title} · ${sceneLabel}`;
}

function deriveClipWindow(scene: ShowSceneRecord) {
  const clipStartSeconds = Math.max(0, scene.startIntentSeconds ?? 0);
  const clipEndSeconds = Math.max(
    clipStartSeconds,
    scene.endIntentSeconds ?? scene.startIntentSeconds ?? clipStartSeconds
  );

  return { clipStartSeconds, clipEndSeconds };
}

export async function listDerivedShortDrafts(showEpisodeId: string) {
  return prisma.$queryRaw<DerivedShortDraftRow[]>`
    SELECT
      draft."id",
      draft."showEpisodeId",
      draft."showSceneId",
      draft."sourceShowId",
      draft."sourceEpisodeId",
      draft."sourceSceneId",
      draft."sourceTimestampSeconds",
      draft."title",
      draft."clipStartSeconds",
      draft."clipEndSeconds",
      draft."notes",
      draft."createdAt",
      draft."updatedAt",
      project."title" AS "sourceShowTitle",
      episode."title" AS "sourceEpisodeTitle",
      scene."sceneNumber" AS "sourceSceneNumber",
      scene."title" AS "sourceSceneTitle"
    FROM "DerivedShortDraft" draft
    INNER JOIN "ShowEpisode" episode ON episode."id" = draft."showEpisodeId"
    INNER JOIN "ShowProject" project ON project."id" = episode."showProjectId"
    INNER JOIN "ShowScene" scene ON scene."id" = draft."showSceneId"
    WHERE draft."showEpisodeId" = ${showEpisodeId}
    ORDER BY scene."sceneNumber" ASC, draft."createdAt" ASC
  `;
}

export async function generateDerivedShortDrafts(episode: ShowEpisodeRecord) {
  if (episode.status !== "READY" && episode.status !== "PUBLISHED") {
    throw new Error("Episode must be READY before generating shorts drafts");
  }

  const scenes = await listShowScenes(episode.id);
  if (scenes.length === 0) {
    throw new Error("Add scenes before generating shorts drafts");
  }

  const existingDrafts = await prisma.$queryRaw<Array<{ showSceneId: string }>>`
    SELECT "showSceneId"
    FROM "DerivedShortDraft"
    WHERE "showEpisodeId" = ${episode.id}
  `;
  const existingSceneIds = new Set(existingDrafts.map((draft) => draft.showSceneId));

  await prisma.$transaction(async (tx) => {
    for (const scene of scenes) {
      const { clipStartSeconds, clipEndSeconds } = deriveClipWindow(scene);
      const sourceTimestampSeconds = scene.startIntentSeconds ?? clipStartSeconds ?? null;
      const title = buildDraftTitle(episode, scene);
      const notes = JSON.stringify({
        sourceType: "SHOW_SCENE",
        sourceSceneNumber: scene.sceneNumber,
        placeholderTimestamps: true
      });

      await tx.$executeRaw`
        INSERT INTO "DerivedShortDraft" (
          "id",
          "showEpisodeId",
          "showSceneId",
          "sourceShowId",
          "sourceEpisodeId",
          "sourceSceneId",
          "sourceTimestampSeconds",
          "title",
          "clipStartSeconds",
          "clipEndSeconds",
          "notes",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${randomUUID()},
          ${episode.id},
          ${scene.id},
          ${episode.showProjectId},
          ${episode.id},
          ${scene.id},
          ${sourceTimestampSeconds},
          ${title},
          ${clipStartSeconds},
          ${clipEndSeconds},
          ${notes},
          NOW(),
          NOW()
        )
        ON CONFLICT ("showEpisodeId", "showSceneId")
        DO UPDATE SET
          "sourceShowId" = EXCLUDED."sourceShowId",
          "sourceEpisodeId" = EXCLUDED."sourceEpisodeId",
          "sourceSceneId" = EXCLUDED."sourceSceneId",
          "sourceTimestampSeconds" = EXCLUDED."sourceTimestampSeconds",
          "title" = EXCLUDED."title",
          "clipStartSeconds" = EXCLUDED."clipStartSeconds",
          "clipEndSeconds" = EXCLUDED."clipEndSeconds",
          "notes" = EXCLUDED."notes",
          "updatedAt" = NOW()
      `;
    }
  });

  const drafts = await listDerivedShortDrafts(episode.id);
  const counts: GeneratedDraftCounts = {
    created: scenes.filter((scene) => !existingSceneIds.has(scene.id)).length,
    updated: scenes.filter((scene) => existingSceneIds.has(scene.id)).length,
    total: drafts.length
  };

  return { drafts, counts };
}
