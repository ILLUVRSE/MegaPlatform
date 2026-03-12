"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ExternalPlatformAppConfig } from "@/lib/platformApps";
import { PLATFORM_EVENT_NAMES, PLATFORM_EVENT_SURFACES } from "@/lib/platformEventTaxonomy";
import { trackPlatformEvent } from "@/lib/platformTelemetry";
import { resolveDirectLaunchUrl, resolveEmbeddedRoute } from "@/lib/platformRoutes";

export default function EmbeddedPlatformApp({ app }: { app: ExternalPlatformAppConfig }) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [frameHeight, setFrameHeight] = useState("75vh");
  const [prefersHeroEdgeToEdge, setPrefersHeroEdgeToEdge] = useState(false);

  const appOrigin = resolveOrigin(app.url);
  const embeddedRoute = resolveEmbeddedRoute(app);
  const embedSrc = buildEmbedSrc(app.url, embeddedRoute);

  useEffect(() => {
    void trackPlatformEvent({
      event: "module_open",
      module: app.name,
      href: embeddedRoute,
      surface: "embedded_app"
    });
  }, [app.name, embeddedRoute]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!event.data || typeof event.data !== "object") return;
      if (appOrigin && event.origin !== appOrigin) return;

      const payload = event.data as {
        type?: string;
        height?: number | "auto";
        prefersHeroEdgeToEdge?: boolean;
        href?: string;
        route?: string;
        storyId?: string;
        storyTitle?: string;
        partyId?: string;
        query?: string;
      };

      switch (payload.type) {
        case "embed-ready":
        case "embed-resize": {
          if (typeof payload.height === "number" && Number.isFinite(payload.height)) {
            setFrameHeight(`${Math.max(720, Math.round(payload.height))}px`);
          } else if (payload.height === "auto") {
            setFrameHeight("75vh");
          }
          setPrefersHeroEdgeToEdge(Boolean(payload.prefersHeroEdgeToEdge));
          break;
        }
        case "embed_interaction": {
          void trackPlatformEvent({
            event: PLATFORM_EVENT_NAMES.embedInteraction,
            module: app.name,
            href: payload.href ?? embeddedRoute,
            surface: PLATFORM_EVENT_SURFACES.embeddedApp
          });
          break;
        }
        case "open-studio": {
          const href = `/studio?source=news${payload.storyId ? `&storyId=${encodeURIComponent(payload.storyId)}` : ""}`;
          void trackPlatformEvent({
            event: PLATFORM_EVENT_NAMES.embedInteraction,
            module: app.name,
            href,
            surface: PLATFORM_EVENT_SURFACES.embeddedApp
          });
          router.push(href);
          break;
        }
        case "join-party": {
          const href =
            payload.partyId
              ? `/party/${encodeURIComponent(payload.partyId)}`
              : `/party/create?source=news${payload.storyId ? `&storyId=${encodeURIComponent(payload.storyId)}` : ""}`;
          void trackPlatformEvent({
            event: PLATFORM_EVENT_NAMES.embedInteraction,
            module: app.name,
            href,
            surface: PLATFORM_EVENT_SURFACES.embeddedApp
          });
          router.push(href);
          break;
        }
        case "open-direct": {
          const href = payload.href ?? resolveDirectLaunchUrl(app);
          void trackPlatformEvent({
            event: PLATFORM_EVENT_NAMES.embedInteraction,
            module: app.name,
            href,
            surface: PLATFORM_EVENT_SURFACES.embeddedApp
          });
          window.open(href, "_blank", "noreferrer");
          break;
        }
        case "search": {
          if (!payload.query) return;
          router.push(`${embeddedRoute}?q=${encodeURIComponent(payload.query)}`);
          break;
        }
        default:
          break;
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [app.name, appOrigin, embeddedRoute, app, router]);

  const postPlatformContext = () => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "platform-context",
        app: app.name,
        route: embeddedRoute,
        theme: "dark",
        presence: []
      },
      appOrigin ?? "*"
    );
  };

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
    <section className={prefersHeroEdgeToEdge ? "space-y-4" : "space-y-5"}>
      <header
        className={
          prefersHeroEdgeToEdge
            ? "rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(73,178,162,0.26),rgba(7,10,20,0.96)_55%)] p-6 text-white shadow-card"
            : "rounded-2xl border border-illuvrse-border bg-white/80 p-5 shadow-card"
        }
      >
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-illuvrse-muted">
          <span>{app.category}</span>
          <span>External App</span>
          <span>{app.route}</span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold">{app.title}</h1>
        <p className={`mt-2 max-w-3xl text-sm ${prefersHeroEdgeToEdge ? "text-white/80" : "text-illuvrse-muted"}`}>
          {app.tagline}
        </p>
        <p className={`mt-1 max-w-3xl text-sm ${prefersHeroEdgeToEdge ? "text-white/65" : "text-illuvrse-muted"}`}>
          {app.description}
        </p>
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
      <div
        className={
          prefersHeroEdgeToEdge
            ? "-mx-4 overflow-visible rounded-[30px] border border-white/10 bg-transparent shadow-card md:-mx-6"
            : "overflow-hidden rounded-2xl border border-illuvrse-border bg-white"
        }
        data-testid="embedded-platform-frame"
      >
        {!loaded ? (
          <div className="flex h-14 items-center border-b border-illuvrse-border px-4 text-xs uppercase tracking-[0.2em] text-illuvrse-muted">
            Loading {app.name}...
          </div>
        ) : null}
        <iframe
          title={app.title}
          ref={iframeRef}
          src={embedSrc}
          className={prefersHeroEdgeToEdge ? "w-full rounded-[30px] bg-transparent" : "w-full"}
          style={{ height: frameHeight }}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          onLoad={() => {
            setLoaded(true);
            postPlatformContext();
          }}
        />
      </div>
    </section>
  );
}

function resolveOrigin(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function buildEmbedSrc(url: string, platformRoute: string) {
  try {
    const embedUrl = new URL(url);
    embedUrl.searchParams.set("embed", "illuvrse");
    embedUrl.searchParams.set("theme", "dark");
    embedUrl.searchParams.set("platformRoute", platformRoute);
    return embedUrl.toString();
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}embed=illuvrse&theme=dark&platformRoute=${encodeURIComponent(platformRoute)}`;
  }
}
