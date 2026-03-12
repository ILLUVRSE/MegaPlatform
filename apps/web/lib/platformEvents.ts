import { prisma } from "@illuvrse/db";
import { z } from "zod";
import {
  normalizeTelemetryEventName,
  PLATFORM_EVENT_NAMES,
  PLATFORM_EVENT_SURFACES
} from "@/lib/platformEventTaxonomy";

export { normalizeTelemetryEventName, PLATFORM_EVENT_NAMES, PLATFORM_EVENT_SURFACES } from "@/lib/platformEventTaxonomy";

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

const gamesEventSchema = z.object({
  event: z.enum([
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
  ]),
  surface: z.enum([
    PLATFORM_EVENT_SURFACES.gamesHome,
    PLATFORM_EVENT_SURFACES.gamesCatalog,
    PLATFORM_EVENT_SURFACES.gamesDetail,
    PLATFORM_EVENT_SURFACES.gamesEmbed,
    PLATFORM_EVENT_SURFACES.gamesCreate
  ]),
  gameSlug: z.string().min(1).max(120).optional(),
  gameId: z.string().min(1).max(120).optional(),
  templateId: z.string().min(1).max(120).optional(),
  href: z.string().min(1).max(500).optional(),
  timestamp: z.string().optional()
});

const platformEventInsertSchema = z.object({
  event: z.string().min(1).max(80),
  module: z.string().min(1).max(120),
  href: z.string().min(1).max(500),
  surface: z.string().min(1).max(80)
});

export type PlatformAppEventPayload = z.infer<typeof platformAppEventSchema>;
export type GamesEventPayload = z.infer<typeof gamesEventSchema>;
export type PlatformEventInsert = z.infer<typeof platformEventInsertSchema>;

export function parsePlatformAppEventPayload(body: unknown) {
  return platformAppEventSchema.safeParse(body);
}

export function parseGamesEventPayload(body: unknown) {
  return gamesEventSchema.safeParse(body);
}

export function resolveGamesModuleName(payload: GamesEventPayload): string {
  if (payload.gameSlug) return `Games:${payload.gameSlug}`;
  if (payload.templateId) return `Games:template:${payload.templateId}`;
  return "Games";
}

export function resolveGamesHref(payload: GamesEventPayload): string {
  return payload.href ?? (payload.gameId ? `/games/user/${payload.gameId}` : "/games");
}

export async function insertPlatformEvent(input: PlatformEventInsert) {
  const parsed = platformEventInsertSchema.parse(input);
  await prisma.$executeRaw`
    INSERT INTO "PlatformEvent" ("id", "event", "module", "href", "surface", "createdAt")
    VALUES (${crypto.randomUUID()}, ${normalizeTelemetryEventName(parsed.event)}, ${parsed.module}, ${parsed.href}, ${parsed.surface}, NOW())
  `;
}
