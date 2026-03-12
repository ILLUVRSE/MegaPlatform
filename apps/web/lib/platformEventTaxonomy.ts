export const PLATFORM_EVENT_NAMES = {
  platformPageLoad: "platform.page_load",
  navClick: "nav_click",
  moduleOpen: "module_open",
  moduleOpenDirect: "module_open_direct",
  embedInteraction: "embed_interaction",
  uxHesitation: "ux_hesitation",
  uxRageClick: "ux_rage_click",
  uxDropoff: "ux_dropoff",
  gamesCatalogView: "games.catalog.view",
  gamesOpen: "games.open",
  gamesOpenDirect: "games.open.direct",
  gamesEmbedLoaded: "game.embed.load",
  gamesCreatorPublish: "game.publish",
  partyVoiceTokenIssued: "party.voice.token.issued"
} as const;

export const PLATFORM_EVENT_SURFACES = {
  headerDesktop: "header_desktop",
  headerMobile: "header_mobile",
  homeHub: "home_hub",
  appsDirectory: "apps_directory",
  embeddedApp: "embedded_app",
  platformShell: "platform_shell",
  onboardingJourney: "onboarding_journey",
  homeWall: "home_wall",
  gamesHome: "games_home",
  gamesCatalog: "games_catalog",
  gamesDetail: "games_detail",
  gamesEmbed: "games_embed",
  gamesCreate: "games_create"
} as const;

export function normalizeTelemetryEventName(event: string): string {
  switch (event) {
    case "catalog_view":
      return PLATFORM_EVENT_NAMES.gamesCatalogView;
    case "game_open":
      return PLATFORM_EVENT_NAMES.gamesOpen;
    case "game_open_direct":
      return PLATFORM_EVENT_NAMES.gamesOpenDirect;
    case "embed_loaded":
      return PLATFORM_EVENT_NAMES.gamesEmbedLoaded;
    case "creator_publish":
      return PLATFORM_EVENT_NAMES.gamesCreatorPublish;
    default:
      return event;
  }
}
