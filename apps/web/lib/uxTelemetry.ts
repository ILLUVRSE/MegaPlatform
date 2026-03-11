import { PLATFORM_EVENT_NAMES, PLATFORM_EVENT_SURFACES } from "@/lib/platformEvents";
import { trackPlatformEvent } from "@/lib/platformTelemetry";

export function trackUxHesitation(module: string, href: string, surface: "onboarding_journey" | "home_wall") {
  return trackPlatformEvent({
    event: PLATFORM_EVENT_NAMES.uxHesitation,
    module,
    href,
    surface: surface === "onboarding_journey" ? PLATFORM_EVENT_SURFACES.onboardingJourney : PLATFORM_EVENT_SURFACES.homeWall
  });
}

export function trackUxRageClick(module: string, href: string, surface: "onboarding_journey" | "home_wall") {
  return trackPlatformEvent({
    event: PLATFORM_EVENT_NAMES.uxRageClick,
    module,
    href,
    surface: surface === "onboarding_journey" ? PLATFORM_EVENT_SURFACES.onboardingJourney : PLATFORM_EVENT_SURFACES.homeWall
  });
}

export function trackUxDropoff(module: string, href: string, surface: "onboarding_journey" | "home_wall") {
  return trackPlatformEvent({
    event: PLATFORM_EVENT_NAMES.uxDropoff,
    module,
    href,
    surface: surface === "onboarding_journey" ? PLATFORM_EVENT_SURFACES.onboardingJourney : PLATFORM_EVENT_SURFACES.homeWall
  });
}
