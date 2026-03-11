import { describe, expect, it } from "vitest";
import { getLocalizedCoreModulePaths, localizePath, resolveLocale } from "@/lib/i18nFoundation";

describe("i18n foundation", () => {
  it("resolves locale from region when locale is absent", async () => {
    const locale = await resolveLocale({ region: "ES" });
    expect(locale).toBe("es-ES");
  });

  it("builds locale-prefixed module paths", async () => {
    const localized = await localizePath("/watch", "fr-FR");
    expect(localized).toBe("/fr/watch");

    const modules = await getLocalizedCoreModulePaths({ locale: "es-ES" });
    expect(modules.modulePaths).toContain("/es/news");
  });
});
