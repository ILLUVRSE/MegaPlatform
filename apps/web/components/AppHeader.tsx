/**
 * Global MegaPlatform header with navigation and create modal.
 * Request/response: client-side UI for navigation and create actions.
 * Guard: admin-only links are hidden unless isAdmin is true.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import PlatformCommandLauncher from "@/components/PlatformCommandLauncher";
import UnifiedSearchBox from "@/components/UnifiedSearchBox";
import { getGlobalNavItems } from "@/lib/navigation";
import { trackPlatformEvent } from "@/lib/platformTelemetry";
import { TYPOGRAPHY_CLASS } from "@/lib/ui/typography";
import { MOTION_CLASS } from "@/lib/ui/motion";

type AppHeaderProps = {
  isAdmin: boolean;
};

export default function AppHeader({ isAdmin }: AppHeaderProps) {
  const pathname = usePathname();
  const navItems = getGlobalNavItems(isAdmin);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className={`border-b border-illuvrse-border bg-white/70 backdrop-blur ${MOTION_CLASS.enterFade}`}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-display text-lg font-bold tracking-wide">
            ILLUVRSE
          </Link>
          <nav aria-label="Global navigation" className="hidden flex-wrap gap-4 text-sm font-semibold text-illuvrse-muted md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() =>
                  void trackPlatformEvent({
                    event: "nav_click",
                    module: item.label,
                    href: item.href,
                    surface: "header_desktop"
                  })
                }
                className={`rounded-full px-3 py-1 transition hover:text-illuvrse-text ${MOTION_CLASS.pressScale} ${
                  isActive(item.href) ? "bg-illuvrse-primary text-white hover:text-white" : ""
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="relative flex items-center gap-3">
          <UnifiedSearchBox />
          <PlatformCommandLauncher />
          <Link
            href="/party"
            onClick={() =>
              void trackPlatformEvent({
                event: "nav_click",
                module: "Party",
                href: "/party",
                surface: "header_desktop"
              })
            }
            className={`rounded-full bg-illuvrse-primary px-4 py-2 text-white ${TYPOGRAPHY_CLASS.eyebrow}`}
          >
            Party Now
          </Link>
        </div>
      </div>

      <nav
        aria-label="Global navigation mobile"
        className="mx-auto flex max-w-6xl flex-wrap gap-3 px-6 pb-4 text-xs font-semibold uppercase tracking-widest md:hidden"
      >
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() =>
              void trackPlatformEvent({
                event: "nav_click",
                module: item.label,
                href: item.href,
                surface: "header_mobile"
              })
            }
            className={`rounded-full border border-illuvrse-border px-3 py-1 ${
              isActive(item.href) ? "border-illuvrse-primary bg-illuvrse-primary text-white" : ""
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
