"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { TYPOGRAPHY_CLASS } from "@/lib/ui/typography";
import { MOTION_CLASS } from "@/lib/ui/motion";

type DeckProps = {
  overview: {
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

function DeckSection({
  title,
  eyebrow,
  children
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-3xl border border-illuvrse-border bg-white/85 p-5 shadow-card ${MOTION_CLASS.enterFadeUp}`}>
      <p className={`${TYPOGRAPHY_CLASS.eyebrow} text-illuvrse-muted`}>{eyebrow}</p>
      <h3 className={`mt-1 ${TYPOGRAPHY_CLASS.titleCard}`}>{title}</h3>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

export default function PlatformControlDeck({ overview }: DeckProps) {
  const lastTrail = overview.sessionGraph.trail.slice(-3).reverse();

  return (
    <section className="grid gap-4 xl:grid-cols-3" data-testid="platform-control-deck">
      <DeckSection eyebrow="Resume" title="Cross-app session graph">
        <p className={TYPOGRAPHY_CLASS.body}>
          Current module: <span className="font-semibold capitalize">{overview.sessionGraph.currentModule}</span>
          {overview.sessionGraph.activeTask ? ` · ${overview.sessionGraph.activeTask}` : ""}
        </p>
        {lastTrail.map((entry) => (
          <Link key={`${entry.module}-${entry.at}`} href={entry.href} className="block rounded-2xl border border-illuvrse-border px-4 py-3">
            <p className={TYPOGRAPHY_CLASS.eyebrow}>{entry.module}</p>
            <p className={TYPOGRAPHY_CLASS.body}>{entry.action ?? "Continue previous activity"}</p>
          </Link>
        ))}
      </DeckSection>

      <DeckSection eyebrow="Inbox" title="Tasks and notifications">
        {overview.inbox.slice(0, 3).map((item) => (
          <Link key={item.id} href={item.href} className="block rounded-2xl border border-illuvrse-border px-4 py-3">
            <p className={TYPOGRAPHY_CLASS.eyebrow}>{item.title}</p>
            <p className={TYPOGRAPHY_CLASS.body}>{item.body}</p>
          </Link>
        ))}
      </DeckSection>

      <DeckSection eyebrow="Squad" title={overview.squad ? overview.squad.name : "Create your squad"}>
        <p className={TYPOGRAPHY_CLASS.body}>
          {overview.squad
            ? `${overview.squad.memberCount} members · ${overview.squad.inviteCount} invites in flight`
            : "Squads let users move from watch to party to games together."}
        </p>
        {overview.recommendations.forYourSquad.map((item) => (
          <Link key={item.id} href={item.href} className="block rounded-2xl border border-illuvrse-border px-4 py-3">
            <p className={TYPOGRAPHY_CLASS.eyebrow}>{item.title}</p>
          </Link>
        ))}
      </DeckSection>

      <DeckSection eyebrow="Economy" title="Wallet and entitlements">
        <p className={TYPOGRAPHY_CLASS.body}>Balance: {(overview.economy.balance / 100).toFixed(2)} credits</p>
        {overview.economy.entitlements.slice(0, 3).map((entry) => (
          <p key={entry.key} className={TYPOGRAPHY_CLASS.body}>
            {entry.key} · {entry.status}
          </p>
        ))}
      </DeckSection>

      <DeckSection eyebrow="Continue" title="Recommended next actions">
        {overview.recommendations.continueWatching.map((item) => (
          <Link key={item.id} href={item.href} className="block rounded-2xl border border-illuvrse-border px-4 py-3">
            <p className={TYPOGRAPHY_CLASS.eyebrow}>{item.title}</p>
          </Link>
        ))}
      </DeckSection>

      <DeckSection eyebrow="Create" title="Creator next moves">
        {overview.recommendations.creatorNext.map((item) => (
          <Link key={item.id} href={item.href} className="block rounded-2xl border border-illuvrse-border px-4 py-3">
            <p className={TYPOGRAPHY_CLASS.eyebrow}>{item.title}</p>
          </Link>
        ))}
      </DeckSection>
    </section>
  );
}
