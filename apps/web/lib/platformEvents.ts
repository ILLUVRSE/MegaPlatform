import { prisma } from "@illuvrse/db";
import { z } from "zod";

export const PLATFORM_EVENT_NAMES = {
  navClick: "nav_click",
  moduleOpen: "module_open",
  moduleOpenDirect: "module_open_direct",
  uxHesitation: "ux_hesitation",
  uxRageClick: "ux_rage_click",
  uxDropoff: "ux_dropoff",
  gamesCatalogView: "catalog_view",
  gamesOpen: "game_open",
  gamesOpenDirect: "game_open_direct",
  gamesEmbedLoaded: "embed_loaded",
  gamesCreatorPublish: "creator_publish"
} as const;

export const PLATFORM_EVENT_SURFACES = {
  headerDesktop: "header_desktop",
  headerMobile: "header_mobile",
  homeHub: "home_hub",
  appsDirectory: "apps_directory",
  embeddedApp: "embedded_app",
  onboardingJourney: "onboarding_journey",
  homeWall: "home_wall",
  gamesHome: "games_home",
  gamesCatalog: "games_catalog",
  gamesDetail: "games_detail",
  gamesEmbed: "games_embed",
  gamesCreate: "games_create"
} as const;

const platformAppEventSchema = z.object({
  event: z.enum([
    PLATFORM_EVENT_NAMES.navClick,
    PLATFORM_EVENT_NAMES.moduleOpen,
    PLATFORM_EVENT_NAMES.moduleOpenDirect,
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
    PLATFORM_EVENT_SURFACES.onboardingJourney,
    PLATFORM_EVENT_SURFACES.homeWall
  ]),
  timestamp: z.string().optional()
});

const gamesEventSchema = z.object({
  event: z.enum([
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
    VALUES (${crypto.randomUUID()}, ${parsed.event}, ${parsed.module}, ${parsed.href}, ${parsed.surface}, NOW())
  `;
}
