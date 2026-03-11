import { afterEach, describe, expect, it } from "vitest";
import {
  getExternalPlatformAppConfig,
  getPlatformDirectoryEntries,
  HEADER_NAV_ITEMS,
  PLATFORM_HUB_MODULES,
  type ExternalPlatformAppKey
} from "@/lib/platformApps";

describe("platform app registry", () => {
  afterEach(() => {
    delete process.env.ILLUVRSE_NEWS_URL;
    delete process.env.ILLUVRSE_GAMEGRID_URL;
    delete process.env.ILLUVRSE_PIXELBRAWL_URL;
  });

  it("has unique nav routes", () => {
    const hrefs = HEADER_NAV_ITEMS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs.includes("/apps")).toBe(true);
  });

  it("has unique platform hub routes", () => {
    const hrefs = PLATFORM_HUB_MODULES.map((module) => module.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("prefers env URL overrides for external modules", () => {
    process.env.ILLUVRSE_NEWS_URL = "https://news.example.com";
    const config = getExternalPlatformAppConfig("news");
    expect(config.url).toBe("https://news.example.com");
  });

  it("provides default URLs for all external module keys", () => {
    const keys: ExternalPlatformAppKey[] = ["news", "gamegrid", "pixelbrawl", "artAtlas"];

    keys.forEach((key) => {
      const config = getExternalPlatformAppConfig(key);
      expect(config.url.startsWith("http://")).toBe(true);
      expect(config.route.startsWith("/")).toBe(true);
      expect(config.name.length).toBeGreaterThan(0);
      expect(config.tagline.length).toBeGreaterThan(10);
    });
  });

  it("builds a directory with both core and external modules", () => {
    const entries = getPlatformDirectoryEntries();
    const types = entries.map((entry) => entry.type);
    expect(types.includes("core")).toBe(true);
    expect(types.includes("external")).toBe(true);

    const uniqueRoutes = new Set(entries.map((entry) => entry.href));
    expect(uniqueRoutes.size).toBe(entries.length);
  });
});
