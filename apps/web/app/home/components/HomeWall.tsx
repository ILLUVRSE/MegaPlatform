"use client";

import { useState } from "react";
import FeedTabs from "@/app/home/components/FeedTabs";
import CreatePostComposer from "@/app/home/components/CreatePostComposer";
import FeedList from "@/app/home/components/FeedList";
import PlatformControlDeck from "@/app/home/components/PlatformControlDeck";
import PlatformHub from "@/app/home/components/PlatformHub";
import OnboardingPrompt from "@/app/home/components/OnboardingPrompt";
import { LAYOUT_CLASS } from "@/lib/ui/layout";

type HomeWallProps = {
  isAdmin?: boolean;
  overview?: {
    sessionGraph: {
      currentModule: string;
      activeTask?: string | null;
      trail: Array<{ module: string; href: string; at: string; action?: string }>;
    };
    inbox: Array<{
      id: string;
      title: string;
      body?: string | null;
      href: string;
      actionLabel?: string | null;
      status: string;
    }>;
    squad: {
      name: string;
      memberCount: number;
      inviteCount: number;
    } | null;
    economy: {
      balance: number;
      entitlements: Array<{ key: string; status: string }>;
    };
    recommendations: {
      continueWatching: Array<{ id: string; title: string; href: string }>;
      forYourSquad: Array<{ id: string; title: string; href: string }>;
      creatorNext: Array<{ id: string; title: string; href: string }>;
    };
  };
};

export default function HomeWall({ isAdmin = false, overview }: HomeWallProps) {
  const [mode, setMode] = useState<"wall" | "shorts">("wall");
  const [refreshToken, setRefreshToken] = useState(0);

  return (
    <div className={LAYOUT_CLASS.stackPage} data-testid="home-wall">
      <OnboardingPrompt />
      {overview ? <PlatformControlDeck overview={overview} /> : null}
      <PlatformHub />
      <CreatePostComposer onCreated={() => setRefreshToken((value) => value + 1)} />
      <FeedTabs mode={mode} onChange={setMode} />
      <FeedList mode={mode} refreshToken={refreshToken} isAdmin={isAdmin} />
    </div>
  );
}
