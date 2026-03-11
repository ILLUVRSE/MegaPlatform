export type ExperimentAssignment = {
  experimentId: string;
  subjectKey: string;
  variant: "A" | "B";
};

export function assignExperiment(experimentId: string, subjectKey: string): ExperimentAssignment {
  let hash = 0;
  const seed = `${experimentId}:${subjectKey}`;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const variant = hash % 2 === 0 ? "A" : "B";
  return { experimentId, subjectKey, variant };
}
