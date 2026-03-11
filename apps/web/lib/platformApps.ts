import { registerExternalModule } from "@/lib/externalModuleSdk";

export type PlatformNavItem = {
  label: string;
  href: string;
};

export type PlatformHubModule = {
  name: string;
  href: string;
  tagline: string;
  badge: string;
};

export const HEADER_NAV_ITEMS: PlatformNavItem[] = [
  { label: "Home", href: "/" },
  { label: "Apps", href: "/apps" },
  { label: "News", href: "/news" },
  { label: "Shorts", href: "/shorts" },
  { label: "Watch", href: "/watch" },
  { label: "Games", href: "/games" },
  { label: "GameGrid", href: "/gamegrid" },
  { label: "PixelBrawl", href: "/pixelbrawl" },
  { label: "Art Atlas", href: "/art-atlas" },
  { label: "Party", href: "/party" },
  { label: "Studio", href: "/studio" }
];

export const PLATFORM_HUB_MODULES: PlatformHubModule[] = [
  {
    name: "News",
    href: "/news",
    tagline: "Editorial + podcast intelligence across gaming, culture, and platform signals.",
    badge: "Media"
  },
  {
    name: "GameGrid",
    href: "/gamegrid",
    tagline: "Arcade and multiplayer catalog with rapid session launch.",
    badge: "Games"
  },
  {
    name: "PixelBrawl",
    href: "/pixelbrawl",
    tagline: "Mobile-first pixel fighter inside the ILLUVRSE ecosystem.",
    badge: "Games"
  },
  {
    name: "Art Atlas",
    href: "/art-atlas",
    tagline: "Explore artists, eras, movements, and public-domain media collections.",
    badge: "Culture"
  },
  {
    name: "Watch",
    href: "/watch",
    tagline: "Lean-back shows, movies, and live channels.",
    badge: "Streaming"
  },
  {
    name: "Party",
    href: "/party",
    tagline: "Real-time synchronized rooms for co-watch sessions.",
    badge: "Social"
  },
  {
    name: "Studio",
    href: "/studio",
    tagline: "Creator tooling for shorts, memes, and publishing ops.",
    badge: "Creator"
  }
];

export type ExternalPlatformAppKey = "news" | "gamegrid" | "pixelbrawl" | "artAtlas";
type PlatformDirectoryType = "core" | "external";
type PlatformCategory = "Media" | "Games" | "Culture";

export type PlatformDirectoryEntry = {
  name: string;
  href: string;
  category: string;
  summary: string;
  type: PlatformDirectoryType;
  launchUrl?: string;
};

type ExternalPlatformAppTemplate = {
  name: string;
  title: string;
  category: PlatformCategory;
  tagline: string;
  route: string;
  envVar: "ILLUVRSE_NEWS_URL" | "ILLUVRSE_GAMEGRID_URL" | "ILLUVRSE_PIXELBRAWL_URL" | "ILLUVRSE_ART_ATLAS_URL";
  defaultUrl: string;
  description: string;
  ctaLabel: string;
};

export type ExternalPlatformAppConfig = Omit<ExternalPlatformAppTemplate, "envVar" | "defaultUrl"> & {
  url: string;
};

const EXTERNAL_PLATFORM_APPS: Record<ExternalPlatformAppKey, ExternalPlatformAppTemplate> = {
  news: {
    name: "News",
    title: "ILLUVRSE News",
    category: "Media",
    tagline: "Editorial and podcast intelligence across platform, gaming, and culture.",
    route: "/news",
    envVar: "ILLUVRSE_NEWS_URL",
    defaultUrl: "http://localhost:3001",
    description: "News is now part of the unified ILLUVRSE platform. Launch it in-app below, or open it in a separate tab.",
    ctaLabel: "Open News"
  },
  gamegrid: {
    name: "GameGrid",
    title: "ILLUVRSE GameGrid",
    category: "Games",
    tagline: "Arcade catalog and rapid session launches for multiplayer moments.",
    route: "/gamegrid",
    envVar: "ILLUVRSE_GAMEGRID_URL",
    defaultUrl: "http://localhost:5173",
    description:
      "GameGrid is now mounted as an ILLUVRSE platform app. Launch it in-app below, or open it in a separate tab.",
    ctaLabel: "Open GameGrid"
  },
  pixelbrawl: {
    name: "PixelBrawl",
    title: "ILLUVRSE PixelBrawl",
    category: "Games",
    tagline: "Mobile-first pixel fighter integrated into the ILLUVRSE shell.",
    route: "/pixelbrawl",
    envVar: "ILLUVRSE_PIXELBRAWL_URL",
    defaultUrl: "http://localhost:5174",
    description:
      "PixelBrawl is now mounted as an ILLUVRSE platform app. Launch it in-app below, or open it in a separate tab.",
    ctaLabel: "Open PixelBrawl"
  },
  artAtlas: {
    name: "Art Atlas",
    title: "ILLUVRSE Art Atlas",
    category: "Culture",
    tagline: "Cultural discovery across artists, eras, movements, and media.",
    route: "/art-atlas",
    envVar: "ILLUVRSE_ART_ATLAS_URL",
    defaultUrl: "http://localhost:3002",
    description:
      "Art Atlas is integrated as a cultural discovery app. Launch it in-app below, or open it in a separate tab.",
    ctaLabel: "Open Art Atlas"
  }
};

export function getExternalPlatformAppConfig(key: ExternalPlatformAppKey): ExternalPlatformAppConfig {
  const app = EXTERNAL_PLATFORM_APPS[key];
  const url = process.env[app.envVar] ?? app.defaultUrl;

  return {
    name: app.name,
    title: app.title,
    category: app.category,
    tagline: app.tagline,
    route: app.route,
    description: app.description,
    ctaLabel: app.ctaLabel,
    url
  };
}

export function getPlatformDirectoryEntries(): PlatformDirectoryEntry[] {
  const externalKeys: ExternalPlatformAppKey[] = ["news", "gamegrid", "pixelbrawl", "artAtlas"];
  const externalEntries = externalKeys.map((key) => {
    const app = getExternalPlatformAppConfig(key);
    const manifest = registerExternalModule({
      id: key,
      name: app.name,
      category: app.category,
      route: app.route,
      launchUrl: app.url,
      tagline: app.tagline,
      description: app.description
    });
    return {
      name: manifest.name,
      href: manifest.route,
      category: manifest.category,
      summary: `${manifest.tagline} ${manifest.description}`,
      type: "external" as const,
      launchUrl: manifest.launchUrl
    };
  });

  const coreEntries: PlatformDirectoryEntry[] = [
    {
      name: "Watch",
      href: "/watch",
      category: "Streaming",
      summary: "Lean-back shows, movies, and live channels.",
      type: "core"
    },
    {
      name: "Shorts",
      href: "/shorts",
      category: "Creator",
      summary: "Short-form vertical feed and monetized short experiences.",
      type: "core"
    },
    {
      name: "Party",
      href: "/party",
      category: "Social",
      summary: "Real-time synchronized rooms for co-watch sessions and interactive minigames.",
      type: "core"
    },
    {
      name: "Studio",
      href: "/studio",
      category: "Creator",
      summary: "Content operations, short creation, and publishing workflows.",
      type: "core"
    },
    {
      name: "Games",
      href: "/games",
      category: "Games",
      summary: "On-platform game creation and playable catalog experiences.",
      type: "core"
    }
  ];

  return [...externalEntries, ...coreEntries];
}
