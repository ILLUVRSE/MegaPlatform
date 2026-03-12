import { prisma } from "@illuvrse/db";
import { z } from "zod";
import {
  normalizeTelemetryEventName,
  PLATFORM_EVENT_NAMES,
  PLATFORM_EVENT_SURFACES
} from "@/lib/platformEventTaxonomy";

export { normalizeTelemetryEventName, PLATFORM_EVENT_NAMES, PLATFORM_EVENT_SURFACES } from "@/lib/platformEventTaxonomy";

function sanitizeText(value: string, max: number) {
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function sanitizeToken(value: string, max: number) {
  return sanitizeText(value, max)
    .replace(/[^a-zA-Z0-9:_./-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, max);
}

function sanitizeHref(value: string | null | undefined, fallback: string) {
  const sanitized = sanitizeText(value ?? fallback, 500);
  if (!sanitized) return fallback;
  if (sanitized.startsWith("/") || sanitized.startsWith("http://") || sanitized.startsWith("https://")) {
    return sanitized;
  }
  return fallback;
}

function optionalText(max: number) {
  return z
    .string()
    .transform((value) => sanitizeText(value, max))
    .pipe(z.string().min(1).max(max))
    .optional()
    .nullable()
    .transform((value) => value ?? null);
}

const platformAppEventSchema = z.object({
  event: z.enum([
    PLATFORM_EVENT_NAMES.platformPageLoad,
    PLATFORM_EVENT_NAMES.navClick,
    PLATFORM_EVENT_NAMES.moduleOpen,
    PLATFORM_EVENT_NAMES.moduleOpenDirect,
    PLATFORM_EVENT_NAMES.embedInteraction,
    PLATFORM_EVENT_NAMES.uxHesitation,
    PLATFORM_EVENT_NAMES.uxRageClick,
    PLATFORM_EVENT_NAMES.uxDropoff
  ]),
  module: z.string().min(1).max(80),
  href: z.string().min(1).max(500),
  surface: z.enum([
    PLATFORM_EVENT_SURFACES.headerDesktop,
    PLATFORM_EVENT_SURFACES.headerMobile,
    PLATFORM_EVENT_SURFACES.homeHub,
    PLATFORM_EVENT_SURFACES.appsDirectory,
    PLATFORM_EVENT_SURFACES.embeddedApp,
    PLATFORM_EVENT_SURFACES.platformShell,
    PLATFORM_EVENT_SURFACES.onboardingJourney,
    PLATFORM_EVENT_SURFACES.homeWall
  ]),
  timestamp: z.string().optional()
});

const gamesTelemetryEventTypeSchema = z.enum([
  "catalog_view",
  "game_open",
  "game_open_direct",
  "embed_loaded",
  "creator_publish",
  PLATFORM_EVENT_NAMES.gamesCatalogView,
  PLATFORM_EVENT_NAMES.gamesOpen,
  PLATFORM_EVENT_NAMES.gamesOpenDirect,
  PLATFORM_EVENT_NAMES.gamesEmbedLoaded,
  PLATFORM_EVENT_NAMES.gamesCreatorPublish
]);

const gamesEventSchema = z
  .object({
    eventType: gamesTelemetryEventTypeSchema,
    timestamp: z.string().datetime({ offset: true }),
    actorId: z
      .string()
      .transform((value) => sanitizeToken(value, 120))
      .pipe(z.string().min(1).max(120)),
    gameId: z
      .string()
      .transform((value) => sanitizeToken(value, 120))
      .pipe(z.string().min(1).max(120)),
    surface: z
      .enum([
        PLATFORM_EVENT_SURFACES.gamesHome,
        PLATFORM_EVENT_SURFACES.gamesCatalog,
        PLATFORM_EVENT_SURFACES.gamesDetail,
        PLATFORM_EVENT_SURFACES.gamesEmbed,
        PLATFORM_EVENT_SURFACES.gamesCreate
      ])
      .optional()
      .default(PLATFORM_EVENT_SURFACES.gamesCatalog),
    gameSlug: optionalText(120),
    templateId: optionalText(120),
    href: optionalText(500)
  })
  .strict()
  .transform((payload) => ({
    ...payload,
    event: normalizeTelemetryEventName(payload.eventType),
    href: payload.href ? sanitizeHref(payload.href, "/games") : null,
    gameSlug: payload.gameSlug ? sanitizeToken(payload.gameSlug, 120) : null,
    templateId: payload.templateId ? sanitizeToken(payload.templateId, 120) : null
  }));

const platformEventInsertSchema = z.object({
  event: z
    .string()
    .transform((value) => sanitizeToken(value, 80))
    .pipe(z.string().min(1).max(80)),
  module: z
    .string()
    .transform((value) => sanitizeToken(value, 120))
    .pipe(z.string().min(1).max(120)),
  href: z
    .string()
    .transform((value) => sanitizeHref(value, "/"))
    .pipe(z.string().min(1).max(500)),
  surface: z
    .string()
    .transform((value) => sanitizeToken(value, 80))
    .pipe(z.string().min(1).max(80))
});

export type PlatformAppEventPayload = z.infer<typeof platformAppEventSchema>;
export type GamesTelemetryPayload = z.infer<typeof gamesEventSchema>;
export type PlatformEventInsert = z.infer<typeof platformEventInsertSchema>;

export function parsePlatformAppEventPayload(body: unknown) {
  return platformAppEventSchema.safeParse(body);
}

export function parseGamesTelemetryPayload(body: unknown) {
  return gamesEventSchema.safeParse(body);
}

export function buildGamesPlatformEventInsert(payload: GamesTelemetryPayload): PlatformEventInsert {
  const moduleSegments = ["Games", payload.gameSlug ?? payload.gameId, payload.templateId ?? null].filter(Boolean);

  return {
    event: payload.event,
    module: moduleSegments.join(":"),
    href: resolveGamesHref(payload),
    surface: payload.surface
  };
}

export function resolveGamesModuleName(payload: GamesTelemetryPayload): string {
  return buildGamesPlatformEventInsert(payload).module;
}

export function resolveGamesHref(payload: GamesTelemetryPayload): string {
  return sanitizeHref(payload.href, payload.gameId ? `/games/user/${payload.gameId}` : "/games");
}

export async function insertPlatformEvent(input: PlatformEventInsert) {
  const parsed = platformEventInsertSchema.parse(input);
  await prisma.platformEvent.create({
    data: {
      id: crypto.randomUUID(),
      event: normalizeTelemetryEventName(parsed.event),
      module: parsed.module,
      href: parsed.href,
      surface: parsed.surface
    }
  });
}
