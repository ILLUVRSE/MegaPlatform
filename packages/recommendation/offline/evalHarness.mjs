import process from "node:process";

const WALL_RANKING_POLICY = {
  recencyHalfLifeHours: 18,
  recencyWeight: 6,
  unresolvedReportPenalty: 1.2,
  freshnessDecaySchedule: [
    { maxAgeHours: 6, multiplier: 1.12 },
    { maxAgeHours: 24, multiplier: 1 },
    { maxAgeHours: 72, multiplier: 0.72 },
    { maxAgeHours: 168, multiplier: 0.42 },
    { maxAgeHours: Number.POSITIVE_INFINITY, multiplier: 0.22 }
  ],
  surgeWindowHours: 8,
  surgeVelocityThreshold: 3.2,
  surgeEngagementThreshold: 8,
  surgeBoost: 3.5,
  lowQualityMinEngagement: 4,
  rapidPostWindowHours: 2,
  lowQualityFreshnessCap: 1.4
};

function parseScenario(argv) {
  const arg = argv.find((entry) => entry.startsWith("--scenario="));
  return arg ? arg.slice("--scenario=".length) : "default";
}

function engagementScore(item) {
  return item.likeCount * 1.1 + item.commentCount * 1.7 + item.shareCount * 2.2;
}

function ageHours(now, createdAt) {
  return Math.max(0, (now - createdAt.getTime()) / (1000 * 60 * 60));
}

function baseScoreBaseline(item, now) {
  const recency = Math.exp(-ageHours(now, item.createdAt) / WALL_RANKING_POLICY.recencyHalfLifeHours) * 6;
  return recency + engagementScore(item) + item.editorial + item.affinityBoost - item.unresolvedReports * WALL_RANKING_POLICY.unresolvedReportPenalty;
}

function freshnessScore(item, now) {
  const age = ageHours(now, item.createdAt);
  const engagement = engagementScore(item);
  const decayMultiplier = WALL_RANKING_POLICY.freshnessDecaySchedule.find((entry) => age <= entry.maxAgeHours)?.multiplier ?? 1;
  const baseRecency = Math.exp(-age / WALL_RANKING_POLICY.recencyHalfLifeHours) * WALL_RANKING_POLICY.recencyWeight * decayMultiplier;
  const velocity = engagement / Math.max(1, age);
  const qualifiesForSurge =
    age <= WALL_RANKING_POLICY.surgeWindowHours &&
    engagement >= WALL_RANKING_POLICY.surgeEngagementThreshold &&
    velocity >= WALL_RANKING_POLICY.surgeVelocityThreshold;
  const lowQualityRapidPost = age <= WALL_RANKING_POLICY.rapidPostWindowHours && engagement < WALL_RANKING_POLICY.lowQualityMinEngagement;
  const surge = qualifiesForSurge ? Math.min(1.75, velocity / WALL_RANKING_POLICY.surgeVelocityThreshold) * WALL_RANKING_POLICY.surgeBoost : 0;
  const uncapped = baseRecency + (lowQualityRapidPost ? 0 : surge);
  return lowQualityRapidPost ? Math.min(uncapped, WALL_RANKING_POLICY.lowQualityFreshnessCap) : uncapped;
}

function baseScoreCandidate(item, now) {
  return (
    freshnessScore(item, now) +
    engagementScore(item) +
    item.editorial +
    item.affinityBoost -
    item.unresolvedReports * WALL_RANKING_POLICY.unresolvedReportPenalty
  );
}

function buildWatchFreshnessScenario() {
  const now = new Date("2026-03-13T12:00:00.000Z").getTime();
  const rows = [
    ["fresh-trending-a", 1, 7, 5, 3, 0, 0, 0.92],
    ["fresh-trending-b", 2, 6, 4, 2, 0, 0, 0.85],
    ["rapid-low-quality-a", 0.5, 0, 1, 0, 0, 0, 0.08],
    ["rapid-low-quality-b", 1, 1, 0, 0, 0, 0, 0.1],
    ["recent-healthy-a", 5, 4, 2, 1, 0, 0, 0.58],
    ["recent-healthy-b", 8, 5, 1, 1, 0, 0, 0.55],
    ["steady-mid-a", 24, 9, 2, 1, 0, 0, 0.42],
    ["steady-mid-b", 30, 10, 3, 1, 0, 0, 0.4],
    ["stale-high-engagement-a", 96, 14, 5, 2, 0, 0, 0.24],
    ["stale-high-engagement-b", 120, 16, 4, 1, 0, 0, 0.2],
    ["editorial-evergreen", 48, 8, 2, 1, 2.8, 0, 0.46],
    ["reported-old", 72, 9, 2, 1, 0, 2, 0.18]
  ];

  return {
    name: "watch-freshness",
    now,
    items: rows.map(([id, age, likes, comments, shares, editorial, reports, label]) => ({
      id,
      createdAt: new Date(now - Number(age) * 60 * 60 * 1000),
      likeCount: Number(likes),
      commentCount: Number(comments),
      shareCount: Number(shares),
      editorial: Number(editorial),
      affinityBoost: 0,
      unresolvedReports: Number(reports),
      clickLabel: Number(label)
    }))
  };
}

function auc(scores, labels) {
  const positives = [];
  const negatives = [];
  for (let i = 0; i < scores.length; i += 1) {
    if (labels[i] >= 0.5) positives.push(scores[i]);
    else negatives.push(scores[i]);
  }
  if (positives.length === 0 || negatives.length === 0) return 0.5;
  let wins = 0;
  for (const pos of positives) {
    for (const neg of negatives) {
      if (pos > neg) wins += 1;
      else if (pos === neg) wins += 0.5;
    }
  }
  return wins / (positives.length * negatives.length);
}

function ks(scores, labels) {
  const pairs = scores.map((score, index) => ({ score, label: labels[index] >= 0.5 ? 1 : 0 })).sort((a, b) => b.score - a.score);
  const positiveCount = pairs.filter((pair) => pair.label === 1).length;
  const negativeCount = Math.max(1, pairs.length - positiveCount);
  let seenPositive = 0;
  let seenNegative = 0;
  let maxDistance = 0;
  for (const pair of pairs) {
    if (pair.label === 1) seenPositive += 1;
    else seenNegative += 1;
    const tpr = positiveCount === 0 ? 0 : seenPositive / positiveCount;
    const fpr = seenNegative / negativeCount;
    maxDistance = Math.max(maxDistance, Math.abs(tpr - fpr));
  }
  return maxDistance;
}

function simulatedCtr(rankings) {
  return rankings.reduce((sum, item, index) => sum + item.clickLabel / Math.log2(index + 2), 0) / rankings.length;
}

function evaluateScenario(scenario) {
  const baseline = scenario.items
    .map((item) => ({ ...item, score: baseScoreBaseline(item, scenario.now) }))
    .sort((a, b) => b.score - a.score);
  const candidate = scenario.items
    .map((item) => ({ ...item, score: baseScoreCandidate(item, scenario.now) }))
    .sort((a, b) => b.score - a.score);
  const labels = scenario.items.map((item) => item.clickLabel);
  const baselineScores = scenario.items.map((item) => baseScoreBaseline(item, scenario.now));
  const candidateScores = scenario.items.map((item) => baseScoreCandidate(item, scenario.now));

  return {
    scenario: scenario.name,
    baseline: {
      ctrSim: Number(simulatedCtr(baseline).toFixed(4)),
      auc: Number(auc(baselineScores, labels).toFixed(4)),
      ks: Number(ks(baselineScores, labels).toFixed(4)),
      top5: baseline.slice(0, 5).map((item) => item.id)
    },
    candidate: {
      ctrSim: Number(simulatedCtr(candidate).toFixed(4)),
      auc: Number(auc(candidateScores, labels).toFixed(4)),
      ks: Number(ks(candidateScores, labels).toFixed(4)),
      top5: candidate.slice(0, 5).map((item) => item.id)
    }
  };
}

const scenarioName = parseScenario(process.argv.slice(2));
if (scenarioName !== "watch-freshness") {
  console.error(`Unsupported scenario: ${scenarioName}`);
  process.exit(1);
}

const result = evaluateScenario(buildWatchFreshnessScenario());
const ctrDelta = Number((result.candidate.ctrSim - result.baseline.ctrSim).toFixed(4));
const aucDelta = Number((result.candidate.auc - result.baseline.auc).toFixed(4));
const ksDelta = Number((result.candidate.ks - result.baseline.ks).toFixed(4));

console.log(JSON.stringify({ ...result, delta: { ctrSim: ctrDelta, auc: aucDelta, ks: ksDelta } }, null, 2));
