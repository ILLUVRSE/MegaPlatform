import { HEADER_NAV_ITEMS } from "@/lib/platformApps";
import { localizePath, resolveLocale } from "@/lib/i18nFoundation";

export type NavItem = {
  href: string;
  label: string;
  requiresAdmin?: boolean;
  requiresProfilePrompt?: boolean;
};

export const WATCH_LOCAL_NAV: NavItem[] = [
  { href: "/watch", label: "Home" },
  { href: "/watch/movies", label: "Movies" },
  { href: "/watch/live", label: "Live" },
  { href: "/watch/profiles", label: "Who's Watching?", requiresProfilePrompt: true }
];

export const GAMES_LOCAL_NAV: NavItem[] = [
  { href: "/games", label: "Catalog" },
  { href: "/games/play", label: "Generator" },
  { href: "/games/community", label: "Community" },
  { href: "/games/create", label: "Create" }
];

export function getGlobalNavItems(isAdmin: boolean): NavItem[] {
  const base: NavItem[] = HEADER_NAV_ITEMS.map((item) => ({ href: item.href, label: item.label }));
  if (isAdmin) {
    base.push({ href: "/admin", label: "Admin", requiresAdmin: true });
  }
  return base;
}

export async function getLocalizedGlobalNavItems(
  isAdmin: boolean,
  localeInput?: {
    locale?: string;
    region?: string;
  }
) {
  const locale = await resolveLocale({
    locale: localeInput?.locale,
    region: localeInput?.region
  });
  const base = getGlobalNavItems(isAdmin);
  const localized = await Promise.all(
    base.map(async (item) => ({
      ...item,
      href: await localizePath(item.href, locale)
    }))
  );
  return localized;
}
