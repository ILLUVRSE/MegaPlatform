import { createMatchState, applyPitchOutcome } from '../rules';
import { DEFAULT_TUNING, type HomerunTuning } from '../config/tuning';
import { resolveSwipeContact } from '../physics/ContactResolver';
import { simulateFlight } from '../physics/flight';
import { PitchSequenceGenerator } from '../pitching/PitchSequenceGenerator';
import type { HomerunDifficulty } from '../types';
import type { ReplayRunLog } from './ReplayLog';
import { mulberry32 } from '../seed/SeededRng';

function randomLane(roll: number) {
  if (roll < 0.26) return -1 as const;
  if (roll > 0.74) return 1 as const;
  return 0 as const;
}

export function runReplaySimulation(
  log: ReplayRunLog,
  difficulty: HomerunDifficulty,
  timingAssist: boolean,
  tuning: HomerunTuning = DEFAULT_TUNING
) {
  let match = createMatchState('classic_10');
  const pitchSeq = new PitchSequenceGenerator(log.seed);
  const rng = mulberry32(log.seed ^ 0x9e3779b9);

  const inputs = log.inputs.slice(0, 10);
  for (let i = 0; i < inputs.length; i += 1) {
    const entry = inputs[i];
    const pitch = pitchSeq.next(difficulty, tuning);
    const pitchLane = randomLane(rng.next());

    const vectorX = entry.endX - entry.startX;
    const vectorY = entry.endY - entry.startY;
    const durationMs = Math.max(16, entry.endTimeMs - entry.startTimeMs);
    const distancePx = Math.hypot(vectorX, vectorY);
    const speedPxPerMs = distancePx / durationMs;

    const resolved = resolveSwipeContact(
      entry.endTimeMs - entry.startTimeMs,
      pitch,
      difficulty,
      pitchLane,
      {
        startX: entry.startX,
        startY: entry.startY,
        endX: entry.endX,
        endY: entry.endY,
        vectorX,
        vectorY,
        angleRad: entry.angleRad,
        speedPxPerMs,
        quality: Math.min(1, speedPxPerMs / 2),
        distancePx,
        durationMs,
        endMs: entry.endTimeMs,
        swingPeakMs: entry.endTimeMs,
        aimLane: vectorX < -8 ? -1 : vectorX > 8 ? 1 : 0,
        swingPlane: Math.max(-1, Math.min(1, -vectorY / 150)),
        path: entry.path
      },
      0,
      timingAssist,
      tuning,
      rng.next()
    );

    const swing = {
      contact: resolved.contact,
      flight: simulateFlight(resolved.contact, rng.next(), tuning)
    };

    match = applyPitchOutcome(match, { role: 'player', swing }, tuning.scoring);
  }

  return match;
}
