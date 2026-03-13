import fs from "fs/promises";
import path from "path";

const DEFAULT_SAMPLE_INTERVAL_MS = 5_000;

const SCENARIOS = {
  "party-network-partition": {
    name: "Party Rooms Network Partition",
    service: "party-rooms",
    baseline: {
      latencyP95Ms: 120,
      availability: 0.998,
      errorRate: 0.004
    },
    sloTargets: {
      latencyP95Ms: 400,
      availability: 0.985,
      errorRate: 0.03
    },
    rollbackCriteria: [
      {
        metricKey: "availability",
        operator: "<=",
        threshold: 0.97,
        reason: "availability dropped below the rollback floor"
      },
      {
        metricKey: "errorRate",
        operator: ">=",
        threshold: 0.08,
        reason: "error rate exceeded the rollback floor"
      }
    ],
    faults: [
      {
        type: "latency",
        target: "live-presence-stream",
        startRatio: 0.05,
        endRatio: 1,
        config: { delayMs: 900 }
      },
      {
        type: "drop_packets",
        target: "party-room-sse",
        startRatio: 0.15,
        endRatio: 1,
        config: { dropRate: 0.45 }
      },
      {
        type: "kill_worker",
        target: "presence-sync-worker",
        startRatio: 0.4,
        endRatio: 0.55,
        config: { worker: "party-presence-2" }
      },
      {
        type: "patch_response",
        target: "/api/party/:code/events",
        startRatio: 0.1,
        endRatio: 0.7,
        config: {
          status: 202,
          body: {
            partitioned: true,
            retryAfterMs: 3000,
            source: "chaos-runner"
          }
        }
      }
    ]
  }
};

function parseArgs(argv) {
  const entries = argv
    .filter((arg) => arg.startsWith("--"))
    .map((arg) => {
      const [key, value = "true"] = arg.slice(2).split("=");
      return [key, value];
    });
  return Object.fromEntries(entries);
}

export function parseDurationMs(value) {
  if (!value) return 30_000;
  const match = /^(\d+)(ms|s|m)$/.exec(value);
  if (!match) {
    throw new Error(`Unsupported duration: ${value}`);
  }
  const amount = Number(match[1]);
  const unit = match[2];
  if (unit === "ms") return amount;
  if (unit === "s") return amount * 1_000;
  return amount * 60_000;
}

function materializeFaults(scenario, durationMs) {
  return scenario.faults.map((fault) => ({
    type: fault.type,
    target: fault.target,
    startMs: Math.round(durationMs * fault.startRatio),
    endMs: Math.round(durationMs * fault.endRatio),
    config: fault.config ?? {}
  }));
}

function isFaultActive(fault, elapsedMs) {
  return elapsedMs >= fault.startMs && elapsedMs <= fault.endMs;
}

function simulateSample({ scenario, activeFaults, elapsedMs, durationMs }) {
  let latencyP95Ms = scenario.baseline.latencyP95Ms;
  let availability = scenario.baseline.availability;
  let errorRate = scenario.baseline.errorRate;

  for (const fault of activeFaults) {
    if (fault.type === "latency") {
      latencyP95Ms += Number(fault.config.delayMs ?? 0);
      availability -= 0.006;
    }
    if (fault.type === "drop_packets") {
      availability -= Number(fault.config.dropRate ?? 0) * 0.04;
      errorRate += Number(fault.config.dropRate ?? 0) * 0.09;
      latencyP95Ms += 80;
    }
    if (fault.type === "kill_worker") {
      availability -= 0.02;
      errorRate += 0.025;
      latencyP95Ms += 120;
    }
    if (fault.type === "patch_response") {
      errorRate += 0.012;
      latencyP95Ms += 40;
    }
  }

  if (elapsedMs >= durationMs) {
    latencyP95Ms = Math.max(scenario.baseline.latencyP95Ms + 50, latencyP95Ms - 300);
    availability = Math.min(scenario.baseline.availability, availability + 0.02);
    errorRate = Math.max(scenario.baseline.errorRate + 0.004, errorRate - 0.03);
  }

  const totalRequests = 1000;
  const failedRequests = Math.round(totalRequests * Math.max(errorRate, 0));
  const successfulRequests = totalRequests - failedRequests;

  return {
    timestamp: new Date(Date.now() + elapsedMs).toISOString(),
    latencyP95Ms: Math.round(latencyP95Ms),
    availability: Number(Math.max(0, Math.min(1, availability)).toFixed(3)),
    errorRate: Number(Math.max(0, errorRate).toFixed(3)),
    successfulRequests,
    failedRequests,
    metadata: {
      activeFaults: activeFaults.map((fault) => fault.type),
      elapsedMs
    }
  };
}

function evaluateRollback(criteria, sample) {
  const valuesForMetric = (metricKey, operator, samples) =>
    operator === "<="
      ? Math.min(...samples.map((entry) => entry[metricKey]))
      : Math.max(...samples.map((entry) => entry[metricKey]));

  return {
    triggered: criteria.some((criterion) =>
      criterion.operator === ">="
        ? valuesForMetric(criterion.metricKey, criterion.operator, sample) >= criterion.threshold
        : valuesForMetric(criterion.metricKey, criterion.operator, sample) <= criterion.threshold
    ),
    reasons: criteria
      .filter((criterion) =>
        criterion.operator === ">="
          ? valuesForMetric(criterion.metricKey, criterion.operator, sample) >= criterion.threshold
          : valuesForMetric(criterion.metricKey, criterion.operator, sample) <= criterion.threshold
      )
      .map((criterion) => criterion.reason)
  };
}

function summarizeImpact(samples, targets) {
  const first = samples[0];
  const last = samples.at(-1);
  const metric = (key, mode) => {
    const values = samples.map((sample) => sample[key]);
    const worst = mode === "min" ? Math.min(...values) : Math.max(...values);
    return {
      baseline: first[key],
      worst,
      final: last[key],
      delta: Number((last[key] - first[key]).toFixed(3)),
      target: targets[key],
      breached: mode === "min" ? worst < targets[key] : worst > targets[key]
    };
  };

  return {
    latencyP95Ms: metric("latencyP95Ms", "max"),
    availability: metric("availability", "min"),
    errorRate: metric("errorRate", "max")
  };
}

export async function runScenario({
  scenario: scenarioName,
  durationMs,
  outputDir = path.join(process.cwd(), "artifacts", "chaos")
}) {
  const scenario = SCENARIOS[scenarioName];
  if (!scenario) {
    throw new Error(`Unknown scenario: ${scenarioName}`);
  }

  const faults = materializeFaults(scenario, durationMs);
  const sampleCount = Math.max(2, Math.ceil(durationMs / DEFAULT_SAMPLE_INTERVAL_MS) + 1);
  const samples = [];

  for (let index = 0; index < sampleCount; index += 1) {
    const elapsedMs = Math.min(durationMs, index * DEFAULT_SAMPLE_INTERVAL_MS);
    const activeFaults = faults.filter((fault) => isFaultActive(fault, elapsedMs));
    samples.push(simulateSample({ scenario, activeFaults, elapsedMs, durationMs }));
  }

  const rollback = evaluateRollback(scenario.rollbackCriteria, samples);
  const report = {
    name: scenario.name,
    scenario: scenarioName,
    service: scenario.service,
    durationMs,
    sampleIntervalMs: DEFAULT_SAMPLE_INTERVAL_MS,
    startedAt: samples[0].timestamp,
    completedAt: samples.at(-1).timestamp,
    faults,
    samples,
    sloImpact: summarizeImpact(samples, scenario.sloTargets),
    autoRollbackTriggered: rollback.triggered,
    rollbackReasons: rollback.reasons,
    safety: {
      productionReady: false,
      warning: "Do not run this chaos scenario against production workloads."
    }
  };

  await fs.mkdir(outputDir, { recursive: true });
  const safeTimestamp = report.startedAt.replace(/[:.]/g, "-");
  const outputPath = path.join(outputDir, `${scenarioName}-${safeTimestamp}.json`);
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf-8");

  return { report, outputPath };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const scenarioName = args.scenario ?? "party-network-partition";
  const durationMs = parseDurationMs(args.duration ?? "30s");
  const { report, outputPath } = await runScenario({
    scenario: scenarioName,
    durationMs
  });

  console.log(JSON.stringify({
    scenario: report.scenario,
    outputPath,
    autoRollbackTriggered: report.autoRollbackTriggered,
    rollbackReasons: report.rollbackReasons,
    sloImpact: report.sloImpact
  }, null, 2));
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;
if (isDirectRun) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
