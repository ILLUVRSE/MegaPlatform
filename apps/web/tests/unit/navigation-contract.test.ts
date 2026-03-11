import { describe, expect, it } from "vitest";
import { GAMES_LOCAL_NAV, WATCH_LOCAL_NAV, getGlobalNavItems, getLocalizedGlobalNavItems } from "@/lib/navigation";

describe("navigation contract", () => {
  it("includes admin link only for admin principals", () => {
    expect(getGlobalNavItems(false).some((item) => item.href === "/admin")).toBe(false);
    expect(getGlobalNavItems(true).some((item) => item.href === "/admin")).toBe(true);
  });

  it("defines watch and games local nav arrays", () => {
    expect(WATCH_LOCAL_NAV.length).toBeGreaterThanOrEqual(3);
    expect(GAMES_LOCAL_NAV.some((item) => item.href === "/games/create")).toBe(true);
  });

  it("can localize global nav hrefs for supported locale", async () => {
    const localized = await getLocalizedGlobalNavItems(false, { locale: "es-ES" });
    expect(localized.some((item) => item.href === "/es/apps")).toBe(true);
  });
});
