import type { ContactResult, FlightResult } from '../types';
import type { HomerunTuning } from '../config/tuning';
import { clamp } from '../config/tuning';

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function computeDistanceFt(exitVelocityMph: number, launchAngleDeg: number, tuning: HomerunTuning): number {
  const velocityFt = exitVelocityMph * 1.46667;
  const angle = toRadians(launchAngleDeg);
  const vy = velocityFt * Math.sin(angle);
  const vx = velocityFt * Math.cos(angle);
  const hang = (2 * vy) / tuning.flight.gravityFt;
  const raw = vx * Math.max(0.2, hang);
  return clamp(raw, tuning.flight.minDistance, tuning.flight.maxDistance);
}

export function computeHangTimeMs(exitVelocityMph: number, launchAngleDeg: number, tuning: HomerunTuning): number {
  const velocityFt = exitVelocityMph * 1.46667;
  const angle = toRadians(launchAngleDeg);
  const vy = velocityFt * Math.sin(angle);
  const hang = (2 * vy) / tuning.flight.gravityFt;
  return clamp(hang * 1000, 800, 4200);
}

export function computeSprayAngleDeg(sprayLane: number, timing: ContactResult['timing'], noise: number, tuning: HomerunTuning): number {
  const laneBias = sprayLane * 12;
  const timingBias = timing === 'early' ? -6 : timing === 'late' ? 6 : 0;
  const noiseBias = (noise - 0.5) * 8;
  return clamp(laneBias + timingBias + noiseBias, -tuning.flight.maxSprayDeg, tuning.flight.maxSprayDeg);
}

export function isFairLanding(distanceFt: number, sprayAngleDeg: number, tuning: HomerunTuning): boolean {
  const distancePx = distanceFt * tuning.flight.pxPerFoot;
  const halfWidth = Math.tan(toRadians(tuning.flight.foulAngleDeg)) * distancePx + 36;
  const landingX = Math.tan(toRadians(sprayAngleDeg)) * distancePx;
  return Math.abs(landingX) <= halfWidth;
}

export function simulateFlight(contact: ContactResult, noise: number, tuning: HomerunTuning): FlightResult {
  if (contact.strike || contact.quality === 'miss') {
    return {
      result: 'strike',
      distanceFt: 0,
      hangTimeMs: 0,
      landingX: 640,
      peakY: 0,
      isHomeRun: false,
      sprayAngleDeg: 0
    };
  }

  const baseDistance = computeDistanceFt(contact.exitVelocityMph, contact.launchAngleDeg, tuning);
  const adjusted = clamp(baseDistance + (noise - 0.5) * 24, tuning.flight.minDistance, tuning.flight.maxDistance);
  const hangTimeMs = computeHangTimeMs(contact.exitVelocityMph, contact.launchAngleDeg, tuning);
  const sprayAngleDeg =
    typeof contact.sprayAngleDeg === 'number'
      ? clamp(contact.sprayAngleDeg + (noise - 0.5) * 6, -tuning.flight.maxSprayDeg, tuning.flight.maxSprayDeg)
      : computeSprayAngleDeg(contact.sprayLane, contact.timing, noise, tuning);
  const distancePx = adjusted * tuning.flight.pxPerFoot;

  const landingX = clamp(640 + Math.tan(toRadians(sprayAngleDeg)) * distancePx, 140, 1140);
  const peakY = clamp(480 - adjusted * 0.62 + Math.abs(sprayAngleDeg) * 2, 40, 360);

  const fair = isFairLanding(adjusted, sprayAngleDeg, tuning);
  const isHomeRun = fair && adjusted >= tuning.flight.homeRunDistance && contact.launchAngleDeg >= 16 && contact.launchAngleDeg <= 45;

  let result: FlightResult['result'];
  if (!fair) result = 'foul';
  else if (isHomeRun) result = 'home_run';
  else if (adjusted < 165) result = 'ground_out';
  else if (adjusted < 240) result = 'line_out';
  else result = 'fly_out';

  return {
    result,
    distanceFt: adjusted,
    hangTimeMs,
    landingX,
    peakY,
    isHomeRun,
    sprayAngleDeg
  };
}
