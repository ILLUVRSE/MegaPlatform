import { replayCastSessionWithPath, type ReelPathPoint } from './rules';
import type { CastSessionEvent, HookQuality, ProgressionState, RarityTier, SpotId, TimeOfDay, WeatherType } from './types';

export const MAX_REPLAYS = 50;
export const MAX_REPLAY_EVENTS = 480;
export const MAX_REPLAY_SAMPLES = 600;

export interface ReplaySample {
  tMs: number;
  reelPower: number;
  tension: number;
  fishStamina: number;
}

export interface FightReplay {
  id: string;
  createdAt: number;
  fishId: string;
  fishName: string;
  rarityTier: RarityTier;
  weightLb: number;
  spotId: SpotId;
  weather: WeatherType;
  timeOfDay: TimeOfDay;
  playerLevel: number;
  seed: number;
  hookQuality: HookQuality;
  initialFishStamina: number;
  finalFishStamina: number;
  maxTension: number;
  fightDurationMs: number;
  eventLog: CastSessionEvent[];
  samples: ReplaySample[];
}

export interface ReplayDraft {
  id: string;
  createdAt: number;
  fishId: string;
  fishName: string;
  rarityTier: RarityTier;
  weightLb: number;
  spotId: SpotId;
  weather: WeatherType;
  timeOfDay: TimeOfDay;
  playerLevel: number;
  seed: number;
  hookQuality: HookQuality;
  initialFishStamina: number;
  eventLog: CastSessionEvent[];
  samples: ReplaySample[];
  maxTension: number;
  fightDurationMs: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function uid(prefix: string, seed: number): string {
  return `${prefix}-${seed.toString(16)}-${Date.now().toString(36)}`;
}

export function createReplayDraft(input: Omit<ReplayDraft, 'id' | 'createdAt' | 'eventLog' | 'samples' | 'maxTension' | 'fightDurationMs'>): ReplayDraft {
  return {
    id: uid('replay', input.seed),
    createdAt: Date.now(),
    ...input,
    eventLog: [],
    samples: [],
    maxTension: 0,
    fightDurationMs: 0
  };
}

export function appendReplayEvent(draft: ReplayDraft, event: CastSessionEvent): void {
  draft.eventLog.push(event);
  if (draft.eventLog.length > MAX_REPLAY_EVENTS) {
    draft.eventLog.splice(0, draft.eventLog.length - MAX_REPLAY_EVENTS);
  }
}

export function appendReplaySample(draft: ReplayDraft, sample: ReplaySample): void {
  draft.samples.push({
    tMs: sample.tMs,
    reelPower: clamp(sample.reelPower, 0, 1),
    tension: clamp(sample.tension, 0, 2),
    fishStamina: Math.max(0, sample.fishStamina)
  });

  if (draft.samples.length > MAX_REPLAY_SAMPLES) {
    draft.samples.splice(0, draft.samples.length - MAX_REPLAY_SAMPLES);
  }

  draft.maxTension = Math.max(draft.maxTension, sample.tension);
  draft.fightDurationMs = Math.max(0, sample.tMs);
}

export function finalizeReplayDraft(draft: ReplayDraft): FightReplay {
  const finalFishStamina = draft.samples[draft.samples.length - 1]?.fishStamina ?? draft.initialFishStamina;
  return {
    ...draft,
    finalFishStamina,
    eventLog: draft.eventLog.slice(-MAX_REPLAY_EVENTS),
    samples: draft.samples.slice(-MAX_REPLAY_SAMPLES)
  };
}

export function addReplayToProgression(state: ProgressionState, replay: FightReplay): ProgressionState {
  const replays = [...state.replays, replay];
  const bounded = replays.length > MAX_REPLAYS ? replays.slice(replays.length - MAX_REPLAYS) : replays;
  return {
    ...state,
    replays: bounded
  };
}

export function replayDeterministicPath(replay: FightReplay): ReelPathPoint[] {
  return replayCastSessionWithPath(replay.seed, replay.initialFishStamina, replay.eventLog).path;
}

export class ReplayPlayer {
  private replay: FightReplay | null = null;
  private timeMs = 0;
  private speed = 1;
  private playing = false;
  private frameIndex = 0;
  private readonly scratch: ReplaySample = { tMs: 0, reelPower: 0, tension: 0, fishStamina: 0 };

  load(replay: FightReplay): void {
    this.replay = replay;
    this.timeMs = 0;
    this.speed = 1;
    this.playing = false;
    this.frameIndex = 0;
    const first = replay.samples[0] ?? { tMs: 0, reelPower: 0, tension: 0, fishStamina: replay.initialFishStamina };
    this.copyToScratch(first);
  }

  setPlaying(value: boolean): void {
    this.playing = value;
  }

  toggleSpeed(): void {
    this.speed = this.speed === 1 ? 2 : 1;
  }

  getSpeed(): number {
    return this.speed;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  scrub(normalized: number): ReplaySample {
    if (!this.replay) return this.scratch;
    const duration = Math.max(1, this.replay.fightDurationMs);
    this.timeMs = clamp(normalized, 0, 1) * duration;
    this.syncFrameIndex();
    return this.scratch;
  }

  step(dtMs: number): ReplaySample {
    if (!this.replay || !this.playing) return this.scratch;
    this.timeMs += Math.max(0, dtMs) * this.speed;
    this.syncFrameIndex();
    return this.scratch;
  }

  getProgress(): number {
    if (!this.replay) return 0;
    return clamp(this.timeMs / Math.max(1, this.replay.fightDurationMs), 0, 1);
  }

  getCurrent(): ReplaySample {
    return this.scratch;
  }

  private syncFrameIndex(): void {
    if (!this.replay) return;
    const samples = this.replay.samples;
    if (samples.length === 0) return;

    while (this.frameIndex + 1 < samples.length && samples[this.frameIndex + 1].tMs <= this.timeMs) {
      this.frameIndex += 1;
    }
    while (this.frameIndex > 0 && samples[this.frameIndex].tMs > this.timeMs) {
      this.frameIndex -= 1;
    }

    this.copyToScratch(samples[this.frameIndex]);
  }

  private copyToScratch(sample: ReplaySample): void {
    this.scratch.tMs = sample.tMs;
    this.scratch.reelPower = sample.reelPower;
    this.scratch.tension = sample.tension;
    this.scratch.fishStamina = sample.fishStamina;
  }
}
