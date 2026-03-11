import { applyShotResolution, createMatchState, resolveSaveGrade } from './rules';
import type { GoalieInputState, GoalieSetup, MatchState, ScheduledShot } from './types';

const LAST_REPLAY_KEY = 'gamegrid.goalie-gauntlet.replay.last.v1';

export interface ReplayInputEvent extends GoalieInputState {
  atMs: number;
}

export interface GoalieReplay {
  capturedAtIso: string;
  seed: number;
  setup: GoalieSetup;
  patternId: string;
  shots: ScheduledShot[];
  inputEvents: ReplayInputEvent[];
  expectedScore: number;
}

export class ReplayRecorder {
  private readonly setup: GoalieSetup;
  private readonly seed: number;
  private readonly patternId: string;
  private readonly shots: ScheduledShot[];
  private readonly inputEvents: ReplayInputEvent[] = [];

  constructor(args: { setup: GoalieSetup; seed: number; patternId: string; shots: ScheduledShot[] }) {
    this.setup = args.setup;
    this.seed = args.seed;
    this.patternId = args.patternId;
    this.shots = args.shots.map((shot) => ({ ...shot }));
  }

  recordInput(input: GoalieInputState): void {
    this.inputEvents.push({ ...input, atMs: input.changedAtMs, coveredZones: input.coveredZones ? [...input.coveredZones] : undefined });
  }

  finalize(expectedScore: number): GoalieReplay {
    return {
      capturedAtIso: new Date().toISOString(),
      seed: this.seed,
      setup: {
        ...this.setup,
        options: { ...this.setup.options }
      },
      patternId: this.patternId,
      shots: this.shots.map((shot) => ({ ...shot })),
      inputEvents: this.inputEvents.map((event) => ({ ...event, coveredZones: event.coveredZones ? [...event.coveredZones] : undefined })),
      expectedScore
    };
  }
}

export function saveLastReplay(replay: GoalieReplay): void {
  try {
    window.localStorage.setItem(LAST_REPLAY_KEY, JSON.stringify(replay));
  } catch {
    // no-op
  }
}

export function loadLastReplay(): GoalieReplay | null {
  try {
    const raw = window.localStorage.getItem(LAST_REPLAY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GoalieReplay;
    if (!Array.isArray(parsed.shots) || !Array.isArray(parsed.inputEvents)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function simulateReplayOutcome(replay: GoalieReplay): MatchState {
  const sortedInputs = replay.inputEvents
    .slice()
    .sort((a, b) => a.atMs - b.atMs)
    .map((event) => ({ ...event, coveredZones: event.coveredZones ? [...event.coveredZones] : undefined }));
  const sortedShots = replay.shots.slice().sort((a, b) => a.arriveAtMs - b.arriveAtMs);

  let state = createMatchState(replay.setup);
  let inputCursor = 0;
  let activeInput: GoalieInputState = {
    zone: 'mid-left',
    changedAtMs: -100_000,
    gestureType: 'drag',
    actionType: 'standard'
  };

  for (let i = 0; i < sortedShots.length; i += 1) {
    const shot = sortedShots[i];

    while (inputCursor < sortedInputs.length && sortedInputs[inputCursor].atMs <= shot.arriveAtMs) {
      const coveredZones = sortedInputs[inputCursor].coveredZones;
      activeInput = {
        zone: sortedInputs[inputCursor].zone,
        changedAtMs: sortedInputs[inputCursor].changedAtMs,
        gestureType: sortedInputs[inputCursor].gestureType,
        actionType: sortedInputs[inputCursor].actionType,
        coveredZones: Array.isArray(coveredZones) ? [...coveredZones] : undefined,
        holdDurationMs: sortedInputs[inputCursor].holdDurationMs
      };
      inputCursor += 1;
    }

    const resolved = resolveSaveGrade(shot, activeInput, replay.setup.difficulty, shot.sequenceIndex);
    state = applyShotResolution(state, shot, resolved.grade, resolved.deltaMs, resolved.actionType).state;
  }

  return state;
}
