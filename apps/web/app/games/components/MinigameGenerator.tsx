"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { MinigameSpec } from "@/lib/minigame/spec";
import { generateRandomMinigame, mutateMinigame, rerollMinigame } from "@/lib/minigame/generator";
import MinigameFrame from "./MinigameFrame";
import SeedControls from "./SeedControls";

const RECENT_SEEDS_KEY = "illuvrse:minigame-seeds";
const MAX_RECENT_SEEDS = 10;

const loadRecentSeeds = () => {
  if (typeof window === "undefined") return [] as string[];
  try {
    const raw = window.localStorage.getItem(RECENT_SEEDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveRecentSeeds = (seeds: string[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RECENT_SEEDS_KEY, JSON.stringify(seeds.slice(0, MAX_RECENT_SEEDS)));
};

export default function MinigameGenerator() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const seedParam = searchParams.get("seed");

  const [spec, setSpec] = useState<MinigameSpec | null>(null);
  const [recentSeeds, setRecentSeeds] = useState<string[]>([]);
  const [copyStatus, setCopyStatus] = useState<string>("");

  const storeSeed = useCallback((nextSeed: string) => {
    setRecentSeeds((prev) => {
      const next = [nextSeed, ...prev.filter((seed) => seed !== nextSeed)].slice(0, MAX_RECENT_SEEDS);
      saveRecentSeeds(next);
      return next;
    });
  }, []);

  useEffect(() => {
    setRecentSeeds(loadRecentSeeds());
  }, []);

  useEffect(() => {
    if (!seedParam) return;
    const seededSpec = generateRandomMinigame({ seed: seedParam });
    setSpec(seededSpec);
  }, [seedParam]);

  useEffect(() => {
    if (!spec) return;
    storeSeed(spec.seed);
  }, [spec, storeSeed]);

  const updateUrlSeed = useCallback(
    (nextSeed: string) => {
      router.replace(`/games/play?seed=${nextSeed}`);
    },
    [router]
  );

  const handleGenerate = useCallback(() => {
    const nextSpec = generateRandomMinigame();
    setSpec(nextSpec);
    storeSeed(nextSpec.seed);
    updateUrlSeed(nextSpec.seed);
  }, [storeSeed, updateUrlSeed]);

  const handleMutate = useCallback(() => {
    if (!spec) return;
    const nextSpec = mutateMinigame(spec);
    setSpec(nextSpec);
    storeSeed(nextSpec.seed);
    updateUrlSeed(nextSpec.seed);
  }, [spec, storeSeed, updateUrlSeed]);

  const handleReroll = useCallback(() => {
    const nextSpec = rerollMinigame(spec ?? undefined);
    setSpec(nextSpec);
    storeSeed(nextSpec.seed);
    updateUrlSeed(nextSpec.seed);
  }, [spec, storeSeed, updateUrlSeed]);

  const handleReplay = useCallback(() => {
    if (!spec) return;
    const nextSpec = generateRandomMinigame({ seed: spec.seed });
    setSpec(nextSpec);
  }, [spec]);

  const handleCopySeed = useCallback(() => {
    if (!spec) return;
    navigator.clipboard.writeText(spec.seed).then(
      () => {
        setCopyStatus("Seed copied!");
        setTimeout(() => setCopyStatus(""), 1500);
      },
      () => setCopyStatus("Copy failed")
    );
  }, [spec]);

  const handleLoadSeed = useCallback(
    (seed: string) => {
      const nextSpec = generateRandomMinigame({ seed });
      setSpec(nextSpec);
      storeSeed(seed);
      updateUrlSeed(seed);
    },
    [storeSeed, updateUrlSeed]
  );

  const instructions = useMemo(() => {
    if (!spec) return [];
    return [spec.instructions, `Modifiers: ${spec.modifiers.join(", ") || "None"}`];
  }, [spec]);

  return (
    <div className="space-y-6">
      <header className="party-card space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">AI Mario Party Generator</p>
        <h1 className="text-3xl font-semibold">Generate Random Minigames</h1>
        <p className="text-sm text-illuvrse-muted">
          30-second arcade chaos. Deterministic seeds. Endless rerolls.
        </p>
        <Link className="party-button interactive-focus inline-flex w-fit" href="/games/party">
          🎉 Start Party Mode
        </Link>
      </header>

      {!spec ? (
        <div className="party-card flex flex-col items-start gap-4">
          <button className="party-button interactive-focus text-lg" onClick={handleGenerate}>
            🎲 Generate Random Minigame
          </button>
          <p className="text-sm text-illuvrse-muted">
            Hit generate to spawn a new, fully playable minigame instantly.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="min-h-[72vh] flex flex-col justify-center">
            <MinigameFrame spec={spec} onReplay={handleReplay} onMutate={handleMutate} onReroll={handleReroll} />
          </div>
          <div className="party-card space-y-4">
            <SeedControls
              spec={spec}
              onMutate={handleMutate}
              onReroll={handleReroll}
              onReplay={handleReplay}
              onCopySeed={handleCopySeed}
            />
            {copyStatus ? <p className="text-sm text-illuvrse-primary" role="status" aria-live="polite">{copyStatus}</p> : null}
            <div className="space-y-2 text-sm text-illuvrse-muted">
              {instructions.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="party-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Seeds</h2>
          {spec ? (
            <button className="interactive-focus text-xs uppercase tracking-[0.3em] text-illuvrse-primary" onClick={handleGenerate}>
              🎲 Reroll Fresh
            </button>
          ) : null}
        </div>
        {recentSeeds.length === 0 ? (
          <p className="text-sm text-illuvrse-muted">No seeds yet. Generate your first minigame.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {recentSeeds.map((seed) => (
              <button
                key={seed}
                className="interactive-focus rounded-full border border-illuvrse-border bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
                onClick={() => handleLoadSeed(seed)}
                aria-label={`Load seed ${seed}`}
              >
                {seed}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
