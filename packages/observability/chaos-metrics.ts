export type ChaosFaultType =
  | "latency"
  | "drop_packets"
  | "kill_worker"
  | "patch_response";

export type ChaosFaultWindow = {
  type: ChaosFaultType;
  target: string;
  startMs: number;
  endMs: number;
  config?: Record<string, unknown>;
};

export type ChaosSloSample = {
  timestamp: string;
  latencyP95Ms: number;
  availability: number;
  errorRate: number;
  successfulRequests: number;
  failedRequests: number;
  metadata?: Record<string, unknown>;
};

export type ChaosRollbackCriterion = {
  metricKey: "latencyP95Ms" | "availability" | "errorRate";
  operator: ">=" | "<=";
  threshold: number;
  reason: string;
};

export type ChaosExperimentConfig = {
  name: string;
  scenario: string;
  durationMs: number;
  sloTargets: {
    latencyP95Ms: number;
    availability: number;
    errorRate: number;
  };
  rollbackCriteria: ChaosRollbackCriterion[];
};

export type ChaosExperimentState = {
  config: ChaosExperimentConfig;
  startedAt: string;
  faults: ChaosFaultWindow[];
  samples: ChaosSloSample[];
};

type ChaosImpactMetric = {
  baseline: number;
  worst: number;
  final: number;
  delta: number;
  target: number;
  breached: boolean;
};

export type ChaosExperimentSummary = {
  name: string;
  scenario: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  sampleCount: number;
  faults: ChaosFaultWindow[];
  sloImpact: {
    latencyP95Ms: ChaosImpactMetric;
    availability: ChaosImpactMetric;
    errorRate: ChaosImpactMetric;
  };
  autoRollbackTriggered: boolean;
  rollbackReasons: string[];
};

function compareMetric(
  observed: number,
  operator: ">=" | "<=",
  threshold: number
) {
  return operator === ">=" ? observed >= threshold : observed <= threshold;
}

function selectCriterionValue(
  samples: ChaosSloSample[],
  metricKey: ChaosRollbackCriterion["metricKey"],
  operator: ChaosRollbackCriterion["operator"]
) {
  const values = samples.map((sample) => sample[metricKey]);
  return operator === "<=" ? Math.min(...values) : Math.max(...values);
}

function summarizeMetric(
  samples: ChaosSloSample[],
  metricKey: keyof Pick<ChaosSloSample, "latencyP95Ms" | "availability" | "errorRate">,
  target: number
): ChaosImpactMetric {
  const baseline = samples[0]?.[metricKey] ?? 0;
  const final = samples.at(-1)?.[metricKey] ?? baseline;
  const values = samples.map((sample) => sample[metricKey]);
  const worst =
    metricKey === "availability"
      ? Math.min(...values)
      : Math.max(...values);
  const breached =
    metricKey === "availability" ? worst < target : worst > target;

  return {
    baseline,
    worst,
    final,
    delta: final - baseline,
    target,
    breached
  };
}

export function createChaosExperiment(
  config: ChaosExperimentConfig
): ChaosExperimentState {
  return {
    config,
    startedAt: new Date().toISOString(),
    faults: [],
    samples: []
  };
}

export function recordChaosFault(
  state: ChaosExperimentState,
  fault: ChaosFaultWindow
) {
  state.faults.push(fault);
  return state;
}

export function recordChaosSample(
  state: ChaosExperimentState,
  sample: ChaosSloSample
) {
  state.samples.push(sample);
  return state;
}

export function finalizeChaosExperiment(
  state: ChaosExperimentState
): ChaosExperimentSummary {
  const samples = state.samples.length > 0
    ? state.samples
    : [
        {
          timestamp: state.startedAt,
          latencyP95Ms: 0,
          availability: 1,
          errorRate: 0,
          successfulRequests: 0,
          failedRequests: 0
        }
      ];

  const rollbackReasons = state.config.rollbackCriteria
    .filter((criterion) => {
      const value = selectCriterionValue(
        samples,
        criterion.metricKey,
        criterion.operator
      );
      return compareMetric(value, criterion.operator, criterion.threshold);
    })
    .map((criterion) => criterion.reason);

  return {
    name: state.config.name,
    scenario: state.config.scenario,
    startedAt: state.startedAt,
    completedAt: new Date().toISOString(),
    durationMs: state.config.durationMs,
    sampleCount: samples.length,
    faults: state.faults,
    sloImpact: {
      latencyP95Ms: summarizeMetric(
        samples,
        "latencyP95Ms",
        state.config.sloTargets.latencyP95Ms
      ),
      availability: summarizeMetric(
        samples,
        "availability",
        state.config.sloTargets.availability
      ),
      errorRate: summarizeMetric(
        samples,
        "errorRate",
        state.config.sloTargets.errorRate
      )
    },
    autoRollbackTriggered: rollbackReasons.length > 0,
    rollbackReasons
  };
}
