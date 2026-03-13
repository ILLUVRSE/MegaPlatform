import { describe, expect, it, vi } from "vitest";

import { WALL_RANKING_POLICY } from "@/lib/feedPolicy";
import { computeFreshnessScore, deriveWallFreshnessSignals, scoreWallPost } from "@/lib/feedRanking";

describe("watch ranking freshness", () => {
  it("applies stronger decay to older content buckets", () => {
    const now = new Date("2026-03-13T12:00:00.000Z").getTime();
    const newer = computeFreshnessScore(
      {
        createdAt: new Date("2026-03-13T10:00:00.000Z"),
        likeCount: 1,
        commentCount: 0,
        shareCount: 0,
        isPinned: false,
        isFeatured: false,
        featuredRank: 0,
        unresolvedReports: 0,
        affinityBoost: 0
      },
      { now }
    );
    const older = computeFreshnessScore(
      {
        createdAt: new Date("2026-03-06T12:00:00.000Z"),
        likeCount: 1,
        commentCount: 0,
        shareCount: 0,
        isPinned: false,
        isFeatured: false,
        featuredRank: 0,
        unresolvedReports: 0,
        affinityBoost: 0
      },
      { now }
    );

    expect(newer.decayMultiplier).toBe(1.12);
    expect(older.decayMultiplier).toBe(0.42);
    expect(newer.total).toBeGreaterThan(older.total);
  });

  it("adds a freshness surge for newly trending posts", () => {
    const now = new Date("2026-03-13T12:00:00.000Z").getTime();
    const trending = computeFreshnessScore(
      {
        createdAt: new Date("2026-03-13T11:00:00.000Z"),
        likeCount: 6,
        commentCount: 4,
        shareCount: 3,
        isPinned: false,
        isFeatured: false,
        featuredRank: 0,
        unresolvedReports: 0,
        affinityBoost: 0
      },
      { now }
    );

    expect(trending.qualifiesForSurge).toBe(true);
    expect(trending.surge).toBeGreaterThan(0);
    expect(trending.total).toBeGreaterThan(trending.baseRecency);
  });

  it("flags low-quality rapid posts for server-side freshness capping", () => {
    const now = new Date("2026-03-13T12:00:00.000Z").getTime();
    const signals = deriveWallFreshnessSignals(
      {
        createdAt: new Date("2026-03-13T11:30:00.000Z"),
        likeCount: 0,
        commentCount: 1,
        shareCount: 0
      },
      { now }
    );
    const score = computeFreshnessScore(
      {
        createdAt: new Date("2026-03-13T11:30:00.000Z"),
        likeCount: 0,
        commentCount: 1,
        shareCount: 0,
        isPinned: false,
        isFeatured: false,
        featuredRank: 0,
        unresolvedReports: 0,
        affinityBoost: 0
      },
      { now, allowSurge: false, maxFreshnessBoost: WALL_RANKING_POLICY.lowQualityFreshnessCap }
    );

    expect(signals.lowQualityRapidPost).toBe(true);
    expect(score.total).toBeLessThanOrEqual(WALL_RANKING_POLICY.lowQualityFreshnessCap);
  });

  it("lets a fast-rising fresh post outrank a stale higher-like post", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-13T12:00:00.000Z"));

    const freshTrending = scoreWallPost({
      createdAt: new Date("2026-03-13T11:00:00.000Z"),
      likeCount: 7,
      commentCount: 3,
      shareCount: 3,
      isPinned: false,
      isFeatured: false,
      featuredRank: 0,
      unresolvedReports: 0,
      affinityBoost: 0
    });
    const olderSteady = scoreWallPost({
      createdAt: new Date("2026-03-08T12:00:00.000Z"),
      likeCount: 10,
      commentCount: 2,
      shareCount: 0,
      isPinned: false,
      isFeatured: false,
      featuredRank: 0,
      unresolvedReports: 0,
      affinityBoost: 0
    });

    expect(freshTrending).toBeGreaterThan(olderSteady);
    vi.useRealTimers();
  });
});
