"use client";

import { useEffect, useState } from "react";
import type { ExternalPlatformAppConfig } from "@/lib/platformApps";
import { trackPlatformEvent } from "@/lib/platformTelemetry";
import { resolveDirectLaunchUrl, resolveEmbeddedRoute } from "@/lib/platformRoutes";

export default function EmbeddedPlatformApp({ app }: { app: ExternalPlatformAppConfig }) {
  const [loaded, setLoaded] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    void trackPlatformEvent({
      event: "module_open",
      module: app.name,
      href: resolveEmbeddedRoute(app),
      surface: "embedded_app"
    });
  }, [app.name, app.route]);

  const copyLaunchUrl = () => {
    navigator.clipboard.writeText(app.url).then(
      () => {
        setCopyStatus("Launch URL copied");
        window.setTimeout(() => setCopyStatus(""), 1400);
      },
      () => setCopyStatus("Copy failed")
    );
  };

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-illuvrse-border bg-white/80 p-5 shadow-card">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-illuvrse-muted">
          <span>{app.category}</span>
          <span>External App</span>
          <span>{app.route}</span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold">{app.title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-illuvrse-muted">{app.tagline}</p>
        <p className="mt-1 max-w-3xl text-sm text-illuvrse-muted">{app.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <a
            href={app.url}
            target="_blank"
            rel="noreferrer"
            onClick={() =>
              void trackPlatformEvent({
                event: "module_open_direct",
                module: app.name,
                href: resolveDirectLaunchUrl(app),
                surface: "embedded_app"
              })
            }
            className="inline-flex rounded-full bg-illuvrse-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white"
          >
            {app.ctaLabel}
          </a>
          <button
            type="button"
            onClick={copyLaunchUrl}
            className="inline-flex rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest text-illuvrse-muted"
          >
            Copy Launch URL
          </button>
          {copyStatus ? <p className="text-xs text-illuvrse-primary">{copyStatus}</p> : null}
        </div>
      </header>
      <div className="overflow-hidden rounded-2xl border border-illuvrse-border bg-white" data-testid="embedded-platform-frame">
        {!loaded ? (
          <div className="flex h-14 items-center border-b border-illuvrse-border px-4 text-xs uppercase tracking-[0.2em] text-illuvrse-muted">
            Loading {app.name}...
          </div>
        ) : null}
        <iframe
          title={app.title}
          src={app.url}
          className="h-[75vh] w-full"
          loading="lazy"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </section>
  );
}
