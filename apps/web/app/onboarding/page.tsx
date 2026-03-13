"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import OnboardingTracker from "@/components/OnboardingTracker";
import SectionHeader from "@/components/ui/SectionHeader";
import SurfaceCard from "@/components/ui/SurfaceCard";
import { trackUxDropoff, type OnboardingUserState } from "@/lib/uxTelemetry";

const STEPS = [
  { id: "watch", title: "Pick something to watch", href: "/watch", detail: "Browse rails and start a show quickly." },
  { id: "party", title: "Start a party room", href: "/party", detail: "Bring friends into synchronized playback." },
  { id: "studio", title: "Create with Studio", href: "/studio", detail: "Generate shorts, memes, and publish." }
] as const;

type OnboardingStep = "started" | "completed" | "first_action";

type PostOnboardingOptions = {
  actionHref?: string;
  componentId?: string;
  interactionMs?: number;
  userState?: OnboardingUserState;
};

async function postOnboarding(step: OnboardingStep, options: PostOnboardingOptions = {}) {
  await fetch("/api/onboarding/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      step,
      actionHref: options.actionHref,
      componentId: options.componentId,
      interactionMs: options.interactionMs,
      userState: options.userState
    })
  }).catch(() => null);
}

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [completed, setCompleted] = useState(false);
  const userState: OnboardingUserState = selectedAction
    ? { status: completed ? "completed" : "active", selectedAction, hasCompletedAction: completed }
    : { status: completed ? "completed" : "new", selectedAction: null, hasCompletedAction: completed };

  useEffect(() => {
    void postOnboarding("started", {
      componentId: "page_load",
      userState
    });
    // initial page view only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onUnload = () => {
      if (!completed) {
        void trackUxDropoff("Onboarding", "/onboarding", "onboarding_journey", {
          componentId: "page_exit",
          userState
        });
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [completed, userState]);

  const handleComplete = async () => {
    if (!selectedAction) return;
    setCompleted(true);
    window.localStorage.setItem("illuvrse:onboarding-completed", "1");
    window.localStorage.removeItem("illuvrse:onboarding-dismissed");
    await postOnboarding("completed", {
      actionHref: selectedAction,
      componentId: "finish_onboarding",
      userState: { status: "completed", selectedAction, hasCompletedAction: true }
    });
    router.push("/home");
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Onboarding"
        title="Get into ILLUVRSE in under two minutes"
        description="Follow one quick path through Watch, Party, and Studio so your home feed can personalize faster."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <SurfaceCard key={step.id} className="space-y-3 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-illuvrse-muted">Step {index + 1}</p>
            <h3 className="text-lg font-semibold">{step.title}</h3>
            <p className="text-sm text-illuvrse-muted">{step.detail}</p>
            <OnboardingTracker componentId={`step_${step.id}`} href={step.href} userState={userState}>
              <Link
                href={step.href}
                className="party-button inline-flex w-fit"
                onClick={() => {
                  setSelectedAction(step.href);
                  void postOnboarding("first_action", {
                    actionHref: step.href,
                    componentId: `step_${step.id}`,
                    userState: { status: "active", selectedAction: step.href, hasCompletedAction: false }
                  });
                }}
              >
                Open {step.title}
              </Link>
            </OnboardingTracker>
          </SurfaceCard>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <OnboardingTracker componentId="finish_onboarding" href="/home" userState={userState}>
          <button
            type="button"
            onClick={handleComplete}
            className="party-button disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!selectedAction}
            aria-disabled={!selectedAction}
            title={!selectedAction ? "Choose a step before finishing onboarding" : undefined}
          >
            Finish onboarding
          </button>
        </OnboardingTracker>
        {!selectedAction ? (
          <p className="self-center text-sm text-illuvrse-muted">Choose one onboarding step before finishing.</p>
        ) : null}
        <OnboardingTracker
          componentId="skip_onboarding"
          href="/home"
          userState={{ status: "dismissed", selectedAction: selectedAction || null, hasCompletedAction: false }}
        >
          <Link
            href="/home"
            className="rounded-full border border-illuvrse-border px-4 py-2 text-sm font-semibold"
            onClick={() => {
              window.localStorage.setItem("illuvrse:onboarding-dismissed", "1");
            }}
          >
            Skip for now
          </Link>
        </OnboardingTracker>
      </div>
    </div>
  );
}
