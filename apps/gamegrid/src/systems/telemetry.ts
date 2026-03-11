import { onAnalyticsEvent, type AnalyticsEvent } from './analytics';

export type TelemetryEvent =
  | AnalyticsEvent
  | { type: 'page_view'; page: string }
  | { type: 'session_start'; timeIso: string }
  | { type: 'party_room'; action: 'create' | 'join' };

const TELEMETRY_KEY = 'gamegrid.telemetry.v1';
const MAX_EVENTS = 200;
let buffer: TelemetryEvent[] = [];

function loadBuffer(): TelemetryEvent[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(TELEMETRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => typeof entry === 'object' && entry !== null) as TelemetryEvent[];
  } catch {
    return [];
  }
}

function saveBuffer(next: TelemetryEvent[]) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(TELEMETRY_KEY, JSON.stringify(next));
  } catch {
    // ignore write errors
  }
}

export function recordTelemetry(event: TelemetryEvent) {
  if (buffer.length === 0) buffer = loadBuffer();
  const next = [...buffer, event].slice(-MAX_EVENTS);
  buffer = next;
  saveBuffer(next);
}

export function installTelemetryBridge() {
  recordTelemetry({ type: 'session_start', timeIso: new Date().toISOString() });
  return onAnalyticsEvent((event) => recordTelemetry(event));
}

export function trackTelemetry(event: TelemetryEvent) {
  recordTelemetry(event);
}

export function loadTelemetry(): TelemetryEvent[] {
  if (buffer.length === 0) buffer = loadBuffer();
  return [...buffer];
}
