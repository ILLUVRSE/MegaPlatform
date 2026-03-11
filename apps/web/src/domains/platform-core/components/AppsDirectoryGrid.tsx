"use client";

import Link from "next/link";
import type { PlatformDirectoryEntry } from "@/lib/platformApps";
import { trackPlatformEvent } from "@/lib/platformTelemetry";
import { resolveDirectLaunchUrl, resolveEmbeddedRoute } from "@/lib/platformRoutes";

export default function AppsDirectoryGrid({ entries }: { entries: PlatformDirectoryEntry[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {entries.map((entry) => (
        <article key={entry.href} className="rounded-2xl border border-illuvrse-border bg-white/80 p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-illuvrse-muted">
            {entry.category} · {entry.type}
          </p>
          <h2 className="mt-2 text-xl font-semibold">{entry.name}</h2>
          <p className="mt-2 text-sm text-illuvrse-muted">{entry.summary}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-widest">
            <Link
              href={resolveEmbeddedRoute(entry)}
              onClick={() =>
                void trackPlatformEvent({
                  event: "module_open",
                  module: entry.name,
                  href: resolveEmbeddedRoute(entry),
                  surface: "apps_directory"
                })
              }
              className="rounded-full border border-illuvrse-border px-3 py-1"
            >
              Open in ILLUVRSE
            </Link>
            {entry.launchUrl ? (
              <a
                href={entry.launchUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() =>
                  void trackPlatformEvent({
                    event: "module_open_direct",
                    module: entry.name,
                    href: resolveDirectLaunchUrl(entry),
                    surface: "apps_directory"
                  })
                }
                className="rounded-full bg-illuvrse-primary px-3 py-1 text-white"
              >
                Open Direct
              </a>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
