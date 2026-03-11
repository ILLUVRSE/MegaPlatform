import { z } from "zod";
import { getServerSession } from "next-auth";
import type { MinigameSpec } from "@/lib/minigame/spec";
import type { MinigameTemplateId } from "@/lib/minigame/spec";
import { validateMinigameSpec } from "@/lib/minigame/spec";
import { autoFixMinigameSpec } from "@/lib/minigame/autofix";
import { buildGamegridSpec, GAMEGRID_TEMPLATES, generateGamegridThumbnail } from "@/lib/minigame/gamegrid";
import { authOptions } from "@/lib/auth";

const templateIds = GAMEGRID_TEMPLATES.map(
  (template) => template.id
) as [MinigameTemplateId, ...MinigameTemplateId[]];

const inputSchema = z.object({
  keys: z.array(z.string()),
  mouse: z.object({ enabled: z.boolean() })
});

const themeSchema = z.object({
  palette: z.string(),
  bgStyle: z.string(),
  sfxStyle: z.string(),
  particles: z.string()
});

const winConditionSchema = z.object({
  type: z.string(),
  target: z.number().optional()
});

const loseConditionSchema = z.object({
  type: z.string(),
  maxMisses: z.number().optional()
});

export const minigameSpecSchema = z.object({
  id: z.string(),
  seed: z.string(),
  templateId: z.enum(templateIds),
  title: z.string(),
  tagline: z.string(),
  instructions: z.string(),
  durationSeconds: z.literal(30),
  inputSchema,
  winCondition: winConditionSchema,
  loseCondition: loseConditionSchema,
  scoring: z.object({ mode: z.literal("winlose") }),
  theme: themeSchema,
  params: z.record(z.number()),
  modifiers: z.array(z.string())
});

export const createGameSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(280).optional(),
  seed: z.string().trim().optional(),
  templateId: z.enum(templateIds),
  specDraft: minigameSpecSchema.optional(),
  paletteId: z.string().optional(),
  thumbnailUrl: z.string().optional()
});

export const updateGameSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(280).optional(),
  specJson: minigameSpecSchema.optional(),
  thumbnailUrl: z.string().optional()
});

export async function getOwnerContext(request: Request) {
  const session = await getServerSession(authOptions);
  const ownerId = session?.user?.id ?? null;
  const ownerKey = ownerId ? null : request.headers.get("x-owner-key")?.trim() ?? null;
  return { ownerId, ownerKey };
}

export function validateAndAutofix(spec: MinigameSpec) {
  const fixed = autoFixMinigameSpec(spec);
  const validation = validateMinigameSpec(fixed.spec);
  if (!validation.ok) {
    throw new Error(validation.errors.join(" "));
  }
  return fixed;
}

export function buildFallbackSpec(options: {
  title: string;
  seed?: string;
  templateId: MinigameTemplateId;
  paletteId?: string;
}) {
  return buildGamegridSpec({
    seed: options.seed,
    templateId: options.templateId,
    difficulty: "normal",
    ramp: 0.5,
    winObjectiveId: undefined,
    loseObjectiveId: undefined,
    modifiers: [],
    paletteId: options.paletteId ?? "neon-burst",
    title: options.title,
    description: null
  });
}

export function buildThumbnail(spec: MinigameSpec) {
  return generateGamegridThumbnail({
    title: spec.title,
    templateId: spec.templateId,
    paletteId: spec.theme.palette
  });
}
