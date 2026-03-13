import { randomUUID } from "node:crypto";
import { prisma } from "@illuvrse/db";
import type { ShowEpisodeRecord } from "@/lib/showEpisodes";
import { listShowScenes, type ShowSceneRecord } from "@/lib/showScenes";

export type ShotlistSuggestionRecord = {
  id: string;
  showEpisodeId: string;
  showSceneId: string | null;
  shotNumber: number;
  title: string;
  framing: string;
  cameraMotion: string;
  lens: string | null;
  durationSeconds: number;
  rationale: string | null;
  isDraft: boolean;
  createdAt: Date;
  updatedAt: Date;
  sourceSceneNumber: number | null;
  sourceSceneTitle: string | null;
};

type ShotlistSuggestionRow = ShotlistSuggestionRecord;

type GenerationCounts = {
  scenes: number;
  suggestions: number;
  replaced: number;
};

type ShotTemplate = {
  title: string;
  framing: string;
  cameraMotion: string;
  lens: string;
  durationSeconds: number;
  rationale: string;
};

const TAG_PROFILES: Array<{
  match: string[];
  template: Omit<ShotTemplate, "durationSeconds" | "rationale">;
  rationale: string;
}> = [
  {
    match: ["intro", "opening", "establishing"],
    template: { title: "Establishing environment", framing: "Wide", cameraMotion: "Slow push", lens: "24mm" },
    rationale: "Open with geography and tone before the scene narrows to character detail."
  },
  {
    match: ["dialogue", "conversation", "interview"],
    template: { title: "Primary dialogue coverage", framing: "Medium two-shot", cameraMotion: "Locked-off", lens: "50mm" },
    rationale: "Hold readable eyelines and coverage for the scene's spoken beat."
  },
  {
    match: ["action", "chase", "fight"],
    template: { title: "Momentum beat", framing: "Wide tracking", cameraMotion: "Tracking", lens: "35mm" },
    rationale: "Favor movement and spatial continuity for action-heavy scenes."
  },
  {
    match: ["emotion", "close", "reaction"],
    template: { title: "Reaction detail", framing: "Close-up", cameraMotion: "Subtle handheld", lens: "85mm" },
    rationale: "Prioritize facial detail where the emotional turn matters most."
  },
  {
    match: ["transition", "montage", "insert"],
    template: { title: "Transition insert", framing: "Insert", cameraMotion: "Static", lens: "70mm" },
    rationale: "Use an insert to bridge time, place, or story emphasis cleanly."
  }
];

const DEFAULT_TEMPLATES: ShotTemplate[] = [
  {
    title: "Establish scene geography",
    framing: "Wide",
    cameraMotion: "Static",
    lens: "24mm",
    durationSeconds: 6,
    rationale: "Anchor the audience in location, blocking, and scene tone."
  },
  {
    title: "Cover the main beat",
    framing: "Medium",
    cameraMotion: "Slow push",
    lens: "50mm",
    durationSeconds: 5,
    rationale: "Capture the core performance or story turn in readable coverage."
  },
  {
    title: "Capture a reaction or insert",
    framing: "Close-up",
    cameraMotion: "Locked-off",
    lens: "85mm",
    durationSeconds: 4,
    rationale: "Add a controllable detail shot to support editorial emphasis."
  },
  {
    title: "Design the exit beat",
    framing: "Wide",
    cameraMotion: "Lateral move",
    lens: "35mm",
    durationSeconds: 5,
    rationale: "End with a transition-friendly beat that leads into the next scene."
  }
];

function normalizeTags(tags: string[] | null) {
  return (tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean);
}

function estimateShotCount(scene: ShowSceneRecord) {
  const wordCount = scene.scriptText.trim().split(/\s+/).filter(Boolean).length;
  const tagCount = normalizeTags(scene.tags).length;

  if (wordCount >= 180 || tagCount >= 3) {
    return 4;
  }
  if (wordCount >= 80 || tagCount >= 1) {
    return 3;
  }
  return 2;
}

function buildTagTemplate(scene: ShowSceneRecord): ShotTemplate | null {
  const sceneTags = normalizeTags(scene.tags);
  const profile = TAG_PROFILES.find((entry) => entry.match.some((match) => sceneTags.includes(match)));
  if (!profile) {
    return null;
  }

  return {
    ...profile.template,
    durationSeconds: sceneTags.includes("action") ? 4 : 5,
    rationale: profile.rationale
  };
}

export function buildDraftShotTemplatesForScene(scene: ShowSceneRecord) {
  const shotCount = estimateShotCount(scene);
  const tagTemplate = buildTagTemplate(scene);
  const templates = [...DEFAULT_TEMPLATES];

  if (tagTemplate) {
    templates.splice(1, 0, tagTemplate);
  }

  return templates.slice(0, shotCount).map((template, index) => ({
    shotNumber: index + 1,
    ...template
  }));
}

function buildSceneSpecificRationale(scene: ShowSceneRecord, template: ShotTemplate) {
  const sceneLabel = scene.title.trim() || `Scene ${scene.sceneNumber}`;
  const textLength = scene.scriptText.trim().length;
  const densityHint =
    textLength >= 700 ? "The longer scene text suggests extra editorial coverage." : "The scene is concise, so coverage stays lean.";

  return `${sceneLabel}: ${template.rationale} ${densityHint}`;
}

export async function listShotlistSuggestions(showEpisodeId: string) {
  return prisma.$queryRaw<ShotlistSuggestionRow[]>`
    SELECT
      suggestion."id",
      suggestion."showEpisodeId",
      suggestion."showSceneId",
      suggestion."shotNumber",
      suggestion."title",
      suggestion."framing",
      suggestion."cameraMotion",
      suggestion."lens",
      suggestion."durationSeconds",
      suggestion."rationale",
      suggestion."isDraft",
      suggestion."createdAt",
      suggestion."updatedAt",
      scene."sceneNumber" AS "sourceSceneNumber",
      scene."title" AS "sourceSceneTitle"
    FROM "ShotlistSuggestion" suggestion
    LEFT JOIN "ShowScene" scene ON scene."id" = suggestion."showSceneId"
    WHERE suggestion."showEpisodeId" = ${showEpisodeId}
    ORDER BY scene."sceneNumber" ASC NULLS FIRST, suggestion."shotNumber" ASC, suggestion."createdAt" ASC
  `;
}

export async function generateDraftShotlistSuggestions(episode: ShowEpisodeRecord) {
  const scenes = await listShowScenes(episode.id);
  if (scenes.length === 0) {
    throw new Error("Add scenes before generating a draft shotlist");
  }

  const existingRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS "count"
    FROM "ShotlistSuggestion"
    WHERE "showEpisodeId" = ${episode.id}
  `;
  const replaced = Number(existingRows[0]?.count ?? 0n);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      DELETE FROM "ShotlistSuggestion"
      WHERE "showEpisodeId" = ${episode.id}
    `;

    for (const scene of scenes) {
      const templates = buildDraftShotTemplatesForScene(scene);

      for (const template of templates) {
        await tx.$executeRaw`
          INSERT INTO "ShotlistSuggestion" (
            "id",
            "showEpisodeId",
            "showSceneId",
            "shotNumber",
            "title",
            "framing",
            "cameraMotion",
            "lens",
            "durationSeconds",
            "rationale",
            "isDraft",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            ${randomUUID()},
            ${episode.id},
            ${scene.id},
            ${template.shotNumber},
            ${template.title},
            ${template.framing},
            ${template.cameraMotion},
            ${template.lens},
            ${template.durationSeconds},
            ${buildSceneSpecificRationale(scene, template)},
            true,
            NOW(),
            NOW()
          )
        `;
      }
    }
  });

  const suggestions = await listShotlistSuggestions(episode.id);
  const counts: GenerationCounts = {
    scenes: scenes.length,
    suggestions: suggestions.length,
    replaced
  };

  return { suggestions, counts };
}
