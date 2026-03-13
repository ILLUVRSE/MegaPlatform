import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { diversifyCandidates, rankCandidates } from "../runtime/candidateGeneratorCore.mjs";
import { evaluateScenario } from "../offline/diversityEval.mjs";
import { generateNegativeSamples } from "../training/negativeSampling.mjs";

async function loadFixture(name) {
  const raw = await readFile(new URL(`../../../test/fixtures/recommendation/${name}`, import.meta.url), "utf8");
  return JSON.parse(raw);
}

test("generateNegativeSamples returns realistic non-interacted negatives", async () => {
  const fixture = await loadFixture("negative-sampling.json");
  const negatives = generateNegativeSamples(fixture.events, fixture.inventory, {
    now: fixture.now,
    negativesPerPositive: 2,
    seed: "unit-test"
  });

  assert.equal(negatives.length, 4);
  assert(negatives.every((sample) => !fixture.events.some((event) => event.itemId === sample.negativeId)));
  assert(negatives.some((sample) => sample.reason.categoryOverlap.includes("sci-fi")));
  assert(negatives.some((sample) => sample.reason.topicOverlap.includes("found-family")));
});

test("diversifyCandidates reduces repeated-category dominance while keeping seeded topics present", async () => {
  const fixture = await loadFixture("diversity-scenario.json");
  const ranked = rankCandidates(fixture.items, { now: fixture.now, policy: fixture.policy });
  const diversified = diversifyCandidates(ranked, {
    limit: 6,
    categoryPenalty: fixture.diversity.categoryPenalty,
    topicalSeed: fixture.diversity.topicalSeed,
    topicalSeedWeight: fixture.diversity.topicalSeedWeight
  });

  const baselineMusicCount = ranked.slice(0, 4).filter((item) => item.categories.includes("music")).length;
  const diversifiedMusicCount = diversified.slice(0, 4).filter((item) => item.categories.includes("music")).length;

  assert(baselineMusicCount > diversifiedMusicCount);
  assert(diversified.slice(0, 4).some((item) => item.topics.includes("festival")));
});

test("evaluateScenario reports nDCG and intra-list-distance for baseline vs diversified candidates", async () => {
  const fixture = await loadFixture("diversity-scenario.json");
  const result = evaluateScenario(fixture, { limit: 6 });

  assert.equal(result.scenario, fixture.name);
  assert(result.baseline.nDCG >= result.diversified.nDCG);
  assert(result.diversified.intraListDistance > result.baseline.intraListDistance);
  assert.notDeepEqual(result.baseline.topIds, result.diversified.topIds);
});
