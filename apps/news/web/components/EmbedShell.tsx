"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function EmbedShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get("embed") === "illuvrse";

  useEffect(() => {
    document.body.classList.toggle("illuvrse-embed", isEmbed);
    return () => document.body.classList.remove("illuvrse-embed");
  }, [isEmbed]);

  useEffect(() => {
    if (!isEmbed || typeof window === "undefined" || window.parent === window) return;

    const targetOrigin = resolveParentOrigin();
    const sendResize = (type: "embed-ready" | "embed-resize") => {
      window.parent.postMessage(
        {
          type,
          height: document.documentElement.scrollHeight,
          prefersHeroEdgeToEdge: pathname === "/"
        },
        targetOrigin
      );
    };

    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => sendResize("embed-resize"));
    observer?.observe(document.body);

    const onMessage = (event: MessageEvent) => {
      if (targetOrigin !== "*" && event.origin !== targetOrigin) return;
      if (!event.data || typeof event.data !== "object") return;

      const payload = event.data as { type?: string; storyId?: string; query?: string };
      if (payload.type === "search" && payload.query) {
        router.push(`/search?q=${encodeURIComponent(payload.query)}&embed=illuvrse`);
      }
      if (payload.type === "open-story" && payload.storyId) {
        router.push(`/cluster/${encodeURIComponent(payload.storyId)}?embed=illuvrse`);
      }
    };

    window.addEventListener("message", onMessage);
    sendResize("embed-ready");

    return () => {
      observer?.disconnect();
      window.removeEventListener("message", onMessage);
    };
  }, [isEmbed, pathname, router]);

  return (
    <main
      className={
        isEmbed
          ? "min-h-screen px-0 pb-16 pt-0"
          : "mx-auto min-h-screen max-w-5xl p-6"
      }
    >
      {children}
    </main>
  );
}

function resolveParentOrigin() {
  if (typeof document === "undefined" || !document.referrer) return "*";

  try {
    return new URL(document.referrer).origin;
  } catch {
    return "*";
  }
}
