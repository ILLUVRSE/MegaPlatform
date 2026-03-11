import { z } from "zod";

const i18nPolicySchema = z.object({
  defaultLocale: z.string().min(2),
  supportedLocales: z.array(z.string().min(2)).min(1),
  regionDefaults: z.record(z.string(), z.string().min(2)),
  localePrefixes: z.record(z.string(), z.string().min(2))
});

const defaultPolicy = {
  defaultLocale: "en-US",
  supportedLocales: ["en-US", "es-ES", "fr-FR"],
  regionDefaults: {
    US: "en-US",
    ES: "es-ES",
    FR: "fr-FR"
  },
  localePrefixes: {
    "en-US": "en",
    "es-ES": "es",
    "fr-FR": "fr"
  }
};

export async function loadI18nFoundationPolicy() {
  return i18nPolicySchema.parse(defaultPolicy);
}

export async function resolveLocale(input: { locale?: string; region?: string }) {
  const policy = await loadI18nFoundationPolicy();

  if (input.locale && policy.supportedLocales.includes(input.locale)) {
    return input.locale;
  }

  if (input.region && policy.regionDefaults[input.region]) {
    return policy.regionDefaults[input.region];
  }

  return policy.defaultLocale;
}

export async function localizePath(pathname: string, locale: string) {
  const policy = await loadI18nFoundationPolicy();
  const cleanPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const prefix = policy.localePrefixes[locale] ?? policy.localePrefixes[policy.defaultLocale] ?? "en";

  return `/${prefix}${cleanPath}`;
}

export async function getLocalizedCoreModulePaths(input: { locale?: string; region?: string }) {
  const locale = await resolveLocale(input);
  const modulePaths = ["/apps", "/news", "/watch", "/games", "/studio"];
  const localized = await Promise.all(modulePaths.map((modulePath) => localizePath(modulePath, locale)));
  return {
    locale,
    modulePaths: localized
  };
}
