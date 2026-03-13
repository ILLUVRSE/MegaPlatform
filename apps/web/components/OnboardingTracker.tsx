"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useRef,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode
} from "react";
import { trackUxHesitation, trackUxRageClick, type OnboardingUserState } from "@/lib/uxTelemetry";

type OnboardingTrackerProps = {
  children: ReactNode;
  componentId: string;
  href: string;
  userState: OnboardingUserState;
  hoverThresholdMs?: number;
  rageClickWindowMs?: number;
  rageClickThreshold?: number;
};

function mergeHandlers<EventType extends MouseEvent<HTMLElement> | PointerEvent<HTMLElement>>(
  original: ((event: EventType) => void) | undefined,
  injected: (event: EventType) => void
) {
  return (event: EventType) => {
    original?.(event);
    injected(event);
  };
}

export default function OnboardingTracker({
  children,
  componentId,
  href,
  userState,
  hoverThresholdMs = 1500,
  rageClickWindowMs = 1200,
  rageClickThreshold = 3
}: OnboardingTrackerProps) {
  const child = Children.only(children);
  const hoverStartedAtRef = useRef<number | null>(null);
  const clickTimestampsRef = useRef<number[]>([]);
  const hesitationTrackedRef = useRef(false);

  if (!isValidElement(child)) {
    return <>{children}</>;
  }

  const interactiveChild = child as ReactElement<{
    onClick?: (event: MouseEvent<HTMLElement>) => void;
    onPointerEnter?: (event: PointerEvent<HTMLElement>) => void;
    onPointerLeave?: (event: PointerEvent<HTMLElement>) => void;
    "data-onboarding-component"?: string;
  }>;
  const childProps = interactiveChild.props as {
    onClick?: (event: MouseEvent<HTMLElement>) => void;
    onPointerEnter?: (event: PointerEvent<HTMLElement>) => void;
    onPointerLeave?: (event: PointerEvent<HTMLElement>) => void;
  };

  const trackContext = (interactionMs?: number) => ({
    componentId,
    interactionMs,
    userState
  });

  return cloneElement(interactiveChild, {
    "data-onboarding-component": componentId,
    onPointerEnter: mergeHandlers(childProps.onPointerEnter, () => {
      hoverStartedAtRef.current = window.performance.now();
      hesitationTrackedRef.current = false;
    }),
    onPointerLeave: mergeHandlers(childProps.onPointerLeave, () => {
      hoverStartedAtRef.current = null;
      hesitationTrackedRef.current = false;
    }),
    onClick: mergeHandlers(childProps.onClick, () => {
      const now = window.performance.now();
      const hoveredMs = hoverStartedAtRef.current === null ? null : now - hoverStartedAtRef.current;

      if (hoveredMs !== null && hoveredMs >= hoverThresholdMs && !hesitationTrackedRef.current) {
        hesitationTrackedRef.current = true;
        void trackUxHesitation("Onboarding", href, "onboarding_journey", trackContext(hoveredMs));
      }

      const recentClicks = clickTimestampsRef.current.filter((timestamp) => now - timestamp <= rageClickWindowMs);
      recentClicks.push(now);
      clickTimestampsRef.current = recentClicks;

      if (recentClicks.length >= rageClickThreshold) {
        clickTimestampsRef.current = [];
        void trackUxRageClick("Onboarding", href, "onboarding_journey", trackContext(0));
      }
    })
  });
}
