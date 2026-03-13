"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SurfaceCard from "@/components/ui/SurfaceCard";

export default function OnboardingPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const completed = window.localStorage.getItem("illuvrse:onboarding-completed") === "1";
    const dismissed = window.localStorage.getItem("illuvrse:onboarding-dismissed") === "1";
    setVisible(!completed && !dismissed);
  }, []);

  if (!visible) return null;

  return (
    <SurfaceCard className="space-y-2 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-illuvrse-muted">First session</p>
      <h2 className="text-lg font-semibold">New here? Take the 2-minute onboarding tour.</h2>
      <p className="text-sm text-illuvrse-muted">Unlock faster feed relevance by completing one watch, party, and studio action.</p>
      <div className="flex gap-2">
        <Link href="/onboarding" className="party-button inline-flex w-fit">
          Start onboarding
        </Link>
        <button
          type="button"
          className="rounded-full border border-illuvrse-border px-4 py-2 text-sm font-semibold"
          onClick={() => {
            window.localStorage.setItem("illuvrse:onboarding-completed", "1");
            setVisible(false);
          }}
        >
          Dismiss
        </button>
      </div>
    </SurfaceCard>
  );
}
