import { readFile } from "node:fs/promises";
import process from "node:process";
import { diversifyCandidates, intraListDistance, ndcg, rankCandidates, summarizeRanking } from "../runtime/candidateGeneratorCore.mjs";

function parseArgs(argv) {
  return argv.reduce(
    (args, entry) => {
      if (entry.startsWith("--baseline=")) args.baseline = entry.slice("--baseline=".length);
      else if (entry.startsWith("--limit=")) args.limit = Number(entry.slice("--limit=".length));
      return args;
    },
    {
      baseline: "test/fixtures/recommendation/diversity-scenario.json",
      limit: 6
    }
  );
}

async function loadScenario(filePath) {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  return {
    ...parsed,
    items: parsed.items.map((item) => ({
      ...item,
      createdAt: new Date(item.createdAt)
    }))
  };
}

export function evaluateScenario(scenario, options = {}) {
  const limit = options.limit ?? 6;
  const ranked = rankCandidates(scenario.items, { now: scenario.now ?? Date.now(), policy: scenario.policy });
  const diversified = diversifyCandidates(ranked, {
    limit,
    categoryPenalty: scenario.diversity?.categoryPenalty,
    topicalSeed: scenario.diversity?.topicalSeed,
    topicalSeedWeight: scenario.diversity?.topicalSeedWeight
  });

  const baselineTop = ranked.slice(0, limit);
  const diversifiedTop = diversified.slice(0, limit);

  return {
    scenario: scenario.name,
    baseline: {
      nDCG: ndcg(baselineTop, limit),
      intraListDistance: intraListDistance(baselineTop, limit),
      topIds: summarizeRanking(baselineTop, limit)
    },
    diversified: {
      nDCG: ndcg(diversifiedTop, limit),
      intraListDistance: intraListDistance(diversifiedTop, limit),
      topIds: summarizeRanking(diversifiedTop, limit)
    }
  };
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  const scenario = await loadScenario(args.baseline);
  const result = evaluateScenario(scenario, { limit: args.limit });
  console.log(
    JSON.stringify(
      {
        ...result,
        delta: {
          nDCG: Number((result.diversified.nDCG - result.baseline.nDCG).toFixed(4)),
          intraListDistance: Number((result.diversified.intraListDistance - result.baseline.intraListDistance).toFixed(4))
        }
      },
      null,
      2
    )
  );
}
