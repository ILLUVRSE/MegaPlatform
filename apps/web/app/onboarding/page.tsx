"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SectionHeader from "@/components/ui/SectionHeader";
import SurfaceCard from "@/components/ui/SurfaceCard";
import { trackUxDropoff, trackUxHesitation, trackUxRageClick } from "@/lib/uxTelemetry";

const STEPS = [
  { id: "watch", title: "Pick something to watch", href: "/watch", detail: "Browse rails and start a show quickly." },
  { id: "party", title: "Start a party room", href: "/party", detail: "Bring friends into synchronized playback." },
  { id: "studio", title: "Create with Studio", href: "/studio", detail: "Generate shorts, memes, and publish." }
] as const;

async function postOnboarding(step: "started" | "completed" | "first_action", actionHref?: string) {
  await fetch("/api/onboarding/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step, actionHref })
  }).catch(() => null);
}

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [, setRageClicks] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    void postOnboarding("started");
  }, []);

  useEffect(() => {
    const hesitationTimer = window.setTimeout(() => {
      if (!selectedAction && !completed) {
        void trackUxHesitation("Onboarding", "/onboarding", "onboarding_journey");
      }
    }, 8000);
    return () => window.clearTimeout(hesitationTimer);
  }, [selectedAction, completed]);

  useEffect(() => {
    const onUnload = () => {
      if (!completed) {
        void trackUxDropoff("Onboarding", "/onboarding", "onboarding_journey");
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [completed]);

  const handleComplete = async () => {
    setRageClicks((count) => {
      const next = count + 1;
      if (next >= 3) {
        void trackUxRageClick("Onboarding", "/onboarding", "onboarding_journey");
      }
      return next;
    });
    setCompleted(true);
    window.localStorage.setItem("illuvrse:onboarding-completed", "1");
    await postOnboarding("completed", selectedAction || "/home");
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
            <Link
              href={step.href}
              className="party-button inline-flex w-fit"
              onClick={() => {
                setSelectedAction(step.href);
                void postOnboarding("first_action", step.href);
              }}
            >
              Open
            </Link>
          </SurfaceCard>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={handleComplete} className="party-button">
          Finish onboarding
        </button>
        <Link href="/home" className="rounded-full border border-illuvrse-border px-4 py-2 text-sm font-semibold">
          Skip for now
        </Link>
      </div>
    </div>
  );
}
