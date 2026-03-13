import { PLATFORM_EVENT_NAMES, PLATFORM_EVENT_SURFACES } from "@/lib/platformEvents";
import { trackPlatformEvent } from "@/lib/platformTelemetry";

type OnboardingUserState = {
  status: "new" | "active" | "completed" | "dismissed";
  selectedAction?: string | null;
  hasCompletedAction?: boolean;
};

type UxContext = {
  componentId?: string;
  interactionMs?: number;
  userState?: OnboardingUserState;
};

function sanitizeSegment(value: string) {
  return value.replace(/[^a-z0-9/_-]+/gi, "-").replace(/-+/g, "-").replace(/^[-/]+|[-/]+$/g, "").toLowerCase();
}

function normalizeAction(action: string | null | undefined) {
  if (!action) return "none";
  return sanitizeSegment(action.replace(/^\//, "").replace(/\//g, "_")) || "none";
}

function buildModuleName(module: string, context?: UxContext) {
  if (!context?.componentId && !context?.userState && typeof context?.interactionMs !== "number") {
    return module;
  }

  const segments = [
    module,
    context.componentId ? `cmp_${sanitizeSegment(context.componentId) || "unknown"}` : null,
    context.userState ? `usr_${context.userState.status}` : null,
    context.userState ? `act_${normalizeAction(context.userState.selectedAction)}` : null,
    typeof context.userState?.hasCompletedAction === "boolean"
      ? context.userState.hasCompletedAction
        ? "done_1"
        : "done_0"
      : null,
    typeof context.interactionMs === "number" ? `ms_${Math.max(0, Math.round(context.interactionMs))}` : null
  ].filter(Boolean);

  return segments.join(":").slice(0, 120);
}

function buildHref(href: string, context?: UxContext) {
  if (!context?.componentId && !context?.userState && typeof context?.interactionMs !== "number") {
    return href;
  }

  const params = new URLSearchParams();
  if (context.componentId) params.set("cmp", sanitizeSegment(context.componentId) || "unknown");
  if (context.userState) {
    params.set("usr", context.userState.status);
    params.set("act", normalizeAction(context.userState.selectedAction));
    params.set("done", context.userState.hasCompletedAction ? "1" : "0");
  }
  if (typeof context.interactionMs === "number") {
    params.set("ms", String(Math.max(0, Math.round(context.interactionMs))));
  }

  const query = params.toString();
  if (!query) return href;
  return `${href}${href.includes("?") ? "&" : "?"}${query}`.slice(0, 500);
}

function buildPayload(module: string, href: string, surface: "onboarding_journey" | "home_wall", context?: UxContext) {
  return {
    module: buildModuleName(module, context),
    href: buildHref(href, context),
    surface: surface === "onboarding_journey" ? PLATFORM_EVENT_SURFACES.onboardingJourney : PLATFORM_EVENT_SURFACES.homeWall
  };
}

export function trackUxHesitation(
  module: string,
  href: string,
  surface: "onboarding_journey" | "home_wall",
  context?: UxContext
) {
  return trackPlatformEvent({
    event: PLATFORM_EVENT_NAMES.uxHesitation,
    ...buildPayload(module, href, surface, context)
  });
}

export function trackUxRageClick(
  module: string,
  href: string,
  surface: "onboarding_journey" | "home_wall",
  context?: UxContext
) {
  return trackPlatformEvent({
    event: PLATFORM_EVENT_NAMES.uxRageClick,
    ...buildPayload(module, href, surface, context)
  });
}

export function trackUxDropoff(
  module: string,
  href: string,
  surface: "onboarding_journey" | "home_wall",
  context?: UxContext
) {
  return trackPlatformEvent({
    event: PLATFORM_EVENT_NAMES.uxDropoff,
    ...buildPayload(module, href, surface, context)
  });
}

export type { OnboardingUserState, UxContext };
