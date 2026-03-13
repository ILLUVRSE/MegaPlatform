import path from "path";
import { promises as fs } from "fs";
import { findRepoRootSync } from "@/lib/repoRoot";

export type PartyVoiceSimulationOptions = {
  roomId?: string;
  roomCode?: string;
  simultaneousConnections?: number;
  durationSeconds?: number;
  presencePingIntervalMs?: number;
  seed?: number;
  packetLossRate?: number;
};

export type PartyVoiceSmokeSlo = {
  id: string;
  name: string;
  actual: number;
  target: number;
  unit: "ratio" | "ms";
  operator: ">=" | "<=";
  pass: boolean;
};

export type PartyVoiceSmokeSummary = {
  generatedAt: string;
  roomId: string;
  roomCode: string;
  simulation: {
    simultaneousConnections: number;
    durationSeconds: number;
    presencePingIntervalMs: number;
    totalPresencePings: number;
    simulatedPacketCount: number;
    seed: number;
  };
  metrics: {
    connectSetupMs: {
      min: number;
      median: number;
      p95: number;
      max: number;
      successRatioUnder1s: number;
    };
    jitterMs: {
      min: number;
      median: number;
      p95: number;
      max: number;
    };
    packetLoss: {
      lostPackets: number;
      totalPackets: number;
      ratio: number;
    };
    reconnectLatencyMs: {
      min: number;
      median: number;
      p95: number;
      max: number;
    };
  };
  slos: PartyVoiceSmokeSlo[];
  pass: boolean;
};

const defaultOptions = {
  roomId: "party-room-smoke",
  roomCode: "SMOKE",
  simultaneousConnections: 20,
  durationSeconds: 30,
  presencePingIntervalMs: 5_000,
  seed: 1337,
  packetLossRate: 0.015
} satisfies Required<PartyVoiceSimulationOptions>;

let outputPath = path.join(findRepoRootSync(), "ops", "logs", "party-voice-perf-smoke.json");

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function createPrng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function percentile(values: number[], ratio: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index] ?? 0;
}

function median(values: number[]) {
  return percentile(values, 0.5);
}

function summarizeSeries(values: number[]) {
  if (values.length === 0) {
    return { min: 0, median: 0, p95: 0, max: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: round(sorted[0] ?? 0),
    median: round(median(sorted)),
    p95: round(percentile(sorted, 0.95)),
    max: round(sorted[sorted.length - 1] ?? 0)
  };
}

export function simulatePartyVoiceSmoke(rawOptions: PartyVoiceSimulationOptions = {}): PartyVoiceSmokeSummary {
  const options = { ...defaultOptions, ...rawOptions };
  const rng = createPrng(options.seed);
  const connectionSamples: number[] = [];
  const jitterSamples: number[] = [];
  const reconnectSamples: number[] = [];
  const totalPresencePings = Math.max(
    options.simultaneousConnections,
    options.simultaneousConnections * Math.max(1, Math.floor((options.durationSeconds * 1000) / options.presencePingIntervalMs))
  );

  let lostPackets = 0;
  const simulatedPacketCount = Math.max(totalPresencePings * 12, options.simultaneousConnections * 20);

  for (let index = 0; index < options.simultaneousConnections; index += 1) {
    const loadFactor = index / Math.max(1, options.simultaneousConnections - 1);
    const connectSetupMs = clamp(
      240 + loadFactor * 420 + rng() * 180 + (index % 5 === 0 ? 80 : 0),
      120,
      1_600
    );
    connectionSamples.push(connectSetupMs);

    const jitterWindows = Math.max(3, Math.floor(options.durationSeconds / 3));
    for (let sampleIndex = 0; sampleIndex < jitterWindows; sampleIndex += 1) {
      const jitter = clamp(8 + loadFactor * 16 + rng() * 18 + (sampleIndex % 7 === 0 ? 4 : 0), 3, 90);
      jitterSamples.push(jitter);
    }

    const reconnectMs = clamp(110 + loadFactor * 180 + rng() * 120 + (index % 6 === 0 ? 50 : 0), 80, 900);
    reconnectSamples.push(reconnectMs);
  }

  for (let packetIndex = 0; packetIndex < simulatedPacketCount; packetIndex += 1) {
    const dynamicLossRate = clamp(options.packetLossRate + rng() * 0.008, 0, 0.3);
    if (rng() < dynamicLossRate) {
      lostPackets += 1;
    }
  }

  const connectSummary = summarizeSeries(connectionSamples);
  const jitterSummary = summarizeSeries(jitterSamples);
  const reconnectSummary = summarizeSeries(reconnectSamples);
  const successRatioUnder1s = round(
    connectionSamples.filter((value) => value < 1_000).length / Math.max(1, connectionSamples.length),
    4
  );
  const packetLossRatio = round(lostPackets / Math.max(1, simulatedPacketCount), 4);

  const slos: PartyVoiceSmokeSlo[] = [
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
      simultaneousConnections: options.simultaneousConnections,
      durationSeconds: options.durationSeconds,
      presencePingIntervalMs: options.presencePingIntervalMs,
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

export async function writePartyVoiceSmokeSummary(summary: PartyVoiceSmokeSummary) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf-8");
  return outputPath;
}

export async function readPartyVoiceSmokeSummary() {
  try {
    const raw = await fs.readFile(outputPath, "utf-8");
    return JSON.parse(raw) as PartyVoiceSmokeSummary;
  } catch {
    return null;
  }
}

export async function buildPartyVoiceObservabilityCard() {
  const latest = await readPartyVoiceSmokeSummary();
  if (!latest) {
    return {
      available: false,
      source: "ops/logs/party-voice-perf-smoke.json",
      status: "missing" as const
    };
  }

  const failedSlos = latest.slos.filter((slo) => !slo.pass);
  return {
    available: true,
    source: "ops/logs/party-voice-perf-smoke.json",
    status: latest.pass ? ("pass" as const) : ("fail" as const),
    generatedAt: latest.generatedAt,
    roomId: latest.roomId,
    roomCode: latest.roomCode,
    simulation: latest.simulation,
    headline: {
      connectP95Ms: latest.metrics.connectSetupMs.p95,
      connectSuccessRatioUnder1s: latest.metrics.connectSetupMs.successRatioUnder1s,
      medianJitterMs: latest.metrics.jitterMs.median,
      packetLossRatio: latest.metrics.packetLoss.ratio,
      medianReconnectMs: latest.metrics.reconnectLatencyMs.median
    },
    slos: latest.slos,
    failedSlos
  };
}

export function setPartyVoiceSmokeOutputPathForTests(nextOutputPath: string | null) {
  outputPath = nextOutputPath ?? path.join(findRepoRootSync(), "ops", "logs", "party-voice-perf-smoke.json");
}
