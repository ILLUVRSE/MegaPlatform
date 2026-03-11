import type { ExternalPlatformAppConfig, PlatformDirectoryEntry } from "@/lib/platformApps";

export function normalizeInternalRoute(route: string): string {
  if (!route) return "/";
  return route.startsWith("/") ? route : `/${route}`;
}

export function resolveEmbeddedRoute(input: Pick<ExternalPlatformAppConfig, "route"> | PlatformDirectoryEntry): string {
  if ("href" in input) {
    return normalizeInternalRoute(input.href);
  }
  return normalizeInternalRoute(input.route);
}

export function resolveDirectLaunchUrl(input: PlatformDirectoryEntry | Pick<ExternalPlatformAppConfig, "url" | "route">): string {
  if ("url" in input) {
    return input.url;
  }
  if ("launchUrl" in input && input.launchUrl) {
    return input.launchUrl;
  }
  return resolveEmbeddedRoute(input);
}
