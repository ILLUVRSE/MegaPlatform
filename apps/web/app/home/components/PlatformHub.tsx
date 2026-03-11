"use client";

import Link from "next/link";
import { PLATFORM_HUB_MODULES } from "@/lib/platformApps";
import { trackPlatformEvent } from "@/lib/platformTelemetry";
import { TYPOGRAPHY_CLASS } from "@/lib/ui/typography";
import { MOTION_CLASS } from "@/lib/ui/motion";

export default function PlatformHub() {
  return (
    <section className={`space-y-4 ${MOTION_CLASS.enterFadeUp}`} data-testid="platform-hub">
      <div className="space-y-1">
        <p className={`${TYPOGRAPHY_CLASS.eyebrow} text-illuvrse-muted`}>Platform Hub</p>
        <h2 className={TYPOGRAPHY_CLASS.titleSection}>Launch any ILLUVRSE module</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PLATFORM_HUB_MODULES.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            onClick={() =>
              void trackPlatformEvent({
                event: "module_open",
                module: module.name,
                href: module.href,
                surface: "home_hub"
              })
            }
            className={`rounded-2xl border border-illuvrse-border bg-white/80 p-5 hover:shadow-card ${MOTION_CLASS.hoverLift} ${MOTION_CLASS.pressScale}`}
          >
            <p className={`${TYPOGRAPHY_CLASS.eyebrow} text-illuvrse-muted`}>{module.badge}</p>
            <h3 className={`mt-2 ${TYPOGRAPHY_CLASS.titleCard}`}>{module.name}</h3>
            <p className={`mt-2 ${TYPOGRAPHY_CLASS.body}`}>{module.tagline}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
