import anomaliesRaw from '../../../content/starlight-chronicles/anomalies.json';
import { createSeededRng, hashStringToSeed } from '../rng';
import type { OutcomeDelta, StarlightProfile } from '../rules';
import { applyOutcome } from '../rules';

export interface RiskEntry {
  weight: number;
  outcome: OutcomeDelta;
}

export interface AnomalyResponse {
  id: 'science' | 'diplomacy' | 'salvage' | 'avoid';
  label: string;
  outcome?: OutcomeDelta;
  riskTable?: RiskEntry[];
}

export interface AnomalyDefinition {
  id: string;
  name: string;
  description: string;
  unlockRank: number;
  tags: string[];
  responses: AnomalyResponse[];
}

interface AnomalyFile {
  anomalies: AnomalyDefinition[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isRiskEntry(value: unknown): value is RiskEntry {
  if (!isRecord(value)) return false;
  return typeof value.weight === 'number' && isRecord(value.outcome);
}

function isResponse(value: unknown): value is AnomalyResponse {
  if (!isRecord(value)) return false;
  return (
    (value.id === 'science' || value.id === 'diplomacy' || value.id === 'salvage' || value.id === 'avoid') &&
    typeof value.label === 'string' &&
    (value.outcome === undefined || isRecord(value.outcome)) &&
    (value.riskTable === undefined || (Array.isArray(value.riskTable) && value.riskTable.every(isRiskEntry)))
  );
}

function isAnomaly(value: unknown): value is AnomalyDefinition {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.description === 'string' &&
    typeof value.unlockRank === 'number' &&
    Array.isArray(value.tags) &&
    Array.isArray(value.responses) &&
    value.responses.every(isResponse)
  );
}

export function loadAnomalies(): AnomalyDefinition[] {
  const parsed = anomaliesRaw as unknown as AnomalyFile;
  if (!parsed || !Array.isArray(parsed.anomalies) || !parsed.anomalies.every(isAnomaly)) {
    throw new Error('starlight anomalies json invalid');
  }
  return parsed.anomalies;
}

export function pickAnomalyForSeed(anomalies: AnomalyDefinition[], runSeed: number, rank: number, allowMystery: boolean): AnomalyDefinition {
  const available = anomalies.filter((entry) => entry.unlockRank <= rank && (allowMystery || !entry.tags.includes('mystery')));
  const rng = createSeededRng(runSeed);
  return rng.pick(available.length > 0 ? available : anomalies);
}

export function resolveResponseOutcome(anomalyId: string, response: AnomalyResponse, runSeed: number): OutcomeDelta {
  if (!response.riskTable || response.riskTable.length === 0) {
    return response.outcome ?? {};
  }

  const totalWeight = response.riskTable.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
  const rng = createSeededRng((runSeed ^ hashStringToSeed(`${anomalyId}:${response.id}`)) >>> 0);
  const roll = rng.next() * Math.max(0.0001, totalWeight);
  let cursor = 0;
  for (let i = 0; i < response.riskTable.length; i += 1) {
    cursor += Math.max(0, response.riskTable[i].weight);
    if (roll <= cursor) return response.riskTable[i].outcome;
  }
  return response.riskTable[response.riskTable.length - 1].outcome;
}

export function applyAnomalyResponse(profile: StarlightProfile, anomaly: AnomalyDefinition, responseId: AnomalyResponse['id'], runSeed: number): StarlightProfile {
  const response = anomaly.responses.find((entry) => entry.id === responseId);
  if (!response) {
    throw new Error(`missing anomaly response ${responseId}`);
  }
  return applyOutcome(profile, resolveResponseOutcome(anomaly.id, response, runSeed));
}
