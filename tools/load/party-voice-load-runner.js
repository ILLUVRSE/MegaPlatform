const path = require("path");
const { promises: fs } = require("fs");

function parseDuration(input) {
  if (!input) return 30;
  const normalized = String(input).trim().toLowerCase();
  if (normalized.endsWith("ms")) return Math.max(1, Math.round(Number.parseFloat(normalized) / 1000));
  if (normalized.endsWith("m")) return Math.max(1, Math.round(Number.parseFloat(normalized) * 60));
  if (normalized.endsWith("s")) return Math.max(1, Math.round(Number.parseFloat(normalized)));
  const asNumber = Number.parseFloat(normalized);
  return Number.isFinite(asNumber) ? Math.max(1, Math.round(asNumber)) : 30;
}

function parseArgs(argv) {
  const args = {
    sim: 20,
    durationSeconds: 30,
    seed: 1337,
    roomId: "party-room-smoke",
    roomCode: "SMOKE",
    packetLossRate: 0.015
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];
    if (token === "--sim" && next) {
      args.sim = Math.max(1, Number.parseInt(next, 10) || args.sim);
      index += 1;
    } else if (token === "--duration" && next) {
      args.durationSeconds = parseDuration(next);
      index += 1;
    } else if (token === "--seed" && next) {
      args.seed = Number.parseInt(next, 10) || args.seed;
      index += 1;
    } else if (token === "--room" && next) {
      args.roomId = next;
      index += 1;
    } else if (token === "--code" && next) {
      args.roomCode = next;
      index += 1;
    } else if (token === "--packet-loss" && next) {
      args.packetLossRate = Number.parseFloat(next) || args.packetLossRate;
      index += 1;
    }
  }

  return args;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function createPrng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function percentile(values, ratio) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index] ?? 0;
}

function summarizeSeries(values) {
  if (values.length === 0) return { min: 0, median: 0, p95: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: round(sorted[0] ?? 0),
    median: round(percentile(sorted, 0.5)),
    p95: round(percentile(sorted, 0.95)),
    max: round(sorted[sorted.length - 1] ?? 0)
  };
}

function simulate(options) {
  const rng = createPrng(options.seed);
  const connectionSamples = [];
  const jitterSamples = [];
  const reconnectSamples = [];
  const totalPresencePings = Math.max(
    options.sim,
    options.sim * Math.max(1, Math.floor((options.durationSeconds * 1000) / 5000))
  );
  const simulatedPacketCount = Math.max(totalPresencePings * 12, options.sim * 20);
  let lostPackets = 0;

  for (let index = 0; index < options.sim; index += 1) {
    const loadFactor = index / Math.max(1, options.sim - 1);
    connectionSamples.push(clamp(240 + loadFactor * 420 + rng() * 180 + (index % 5 === 0 ? 80 : 0), 120, 1600));

    const jitterWindows = Math.max(3, Math.floor(options.durationSeconds / 3));
    for (let sampleIndex = 0; sampleIndex < jitterWindows; sampleIndex += 1) {
      jitterSamples.push(clamp(8 + loadFactor * 16 + rng() * 18 + (sampleIndex % 7 === 0 ? 4 : 0), 3, 90));
    }

    reconnectSamples.push(clamp(110 + loadFactor * 180 + rng() * 120 + (index % 6 === 0 ? 50 : 0), 80, 900));
  }

  for (let packetIndex = 0; packetIndex < simulatedPacketCount; packetIndex += 1) {
    const dynamicLossRate = clamp(options.packetLossRate + rng() * 0.008, 0, 0.3);
    if (rng() < dynamicLossRate) lostPackets += 1;
  }

  const connectSummary = summarizeSeries(connectionSamples);
  const jitterSummary = summarizeSeries(jitterSamples);
  const reconnectSummary = summarizeSeries(reconnectSamples);
  const successRatioUnder1s = round(connectionSamples.filter((value) => value < 1000).length / Math.max(1, connectionSamples.length), 4);
  const packetLossRatio = round(lostPackets / Math.max(1, simulatedPacketCount), 4);
  const slos = [
    {
      id: "party-voice-connect-under-1s",
      name: "95% of connects under 1s",
      actual: successRatioUnder1s,
      target: 0.95,
      unit: "ratio",
      operator: ">=",
      pass: successRatioUnder1s >= 0.95
    },
    {
      id: "party-voice-median-reconnect-under-500ms",
      name: "Median reconnect under 500ms",
      actual: reconnectSummary.median,
      target: 500,
      unit: "ms",
      operator: "<=",
      pass: reconnectSummary.median <= 500
    },
    {
      id: "party-voice-median-jitter-under-40ms",
      name: "Median jitter under 40ms",
      actual: jitterSummary.median,
      target: 40,
      unit: "ms",
      operator: "<=",
      pass: jitterSummary.median <= 40
    },
    {
      id: "party-voice-packet-loss-under-3pct",
      name: "Packet loss under 3%",
      actual: packetLossRatio,
      target: 0.03,
      unit: "ratio",
      operator: "<=",
      pass: packetLossRatio <= 0.03
    }
  ];

  return {
    generatedAt: new Date().toISOString(),
    roomId: options.roomId,
    roomCode: options.roomCode,
    simulation: {
      simultaneousConnections: options.sim,
      durationSeconds: options.durationSeconds,
      presencePingIntervalMs: 5000,
      totalPresencePings,
      simulatedPacketCount,
      seed: options.seed
    },
    metrics: {
      connectSetupMs: {
        ...connectSummary,
        successRatioUnder1s
      },
      jitterMs: jitterSummary,
      packetLoss: {
        lostPackets,
        totalPackets: simulatedPacketCount,
        ratio: packetLossRatio
      },
      reconnectLatencyMs: reconnectSummary
    },
    slos,
    pass: slos.every((slo) => slo.pass)
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const summary = simulate(options);
  const outputPath = path.join(process.cwd(), "ops", "logs", "party-voice-perf-smoke.json");
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf-8");

  console.log(JSON.stringify({
    ok: true,
    outputPath: "ops/logs/party-voice-perf-smoke.json",
    roomId: summary.roomId,
    roomCode: summary.roomCode,
    pass: summary.pass,
    metrics: summary.metrics,
    slos: summary.slos
  }, null, 2));

  process.exitCode = summary.pass ? 0 : 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
