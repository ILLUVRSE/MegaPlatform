import { describe, expect, it } from 'vitest';
import { computeDistanceFt, isFairLanding, simulateFlight } from './flight';
import { DEFAULT_TUNING } from '../config/tuning';
import type { ContactResult } from '../types';

describe('homerun flight model', () => {
  it('computes plausible distances for strong contact', () => {
    const distance = computeDistanceFt(105, 28, DEFAULT_TUNING);
    expect(distance).toBeGreaterThan(300);
    expect(distance).toBeLessThanOrEqual(500);
  });

  it('detects fair vs foul landings based on spray angle', () => {
    const fair = isFairLanding(360, 5, DEFAULT_TUNING);
    const foul = isFairLanding(360, 40, DEFAULT_TUNING);
    expect(fair).toBe(true);
    expect(foul).toBe(false);
  });

  it('handles foul line edge cases', () => {
    const edge = DEFAULT_TUNING.flight.foulAngleDeg;
    expect(isFairLanding(320, edge - 0.5, DEFAULT_TUNING)).toBe(true);
    expect(isFairLanding(320, edge + 5, DEFAULT_TUNING)).toBe(false);
  });

  it('flags home runs at the wall boundary', () => {
    const contact: ContactResult = {
      timing: 'perfect',
      quality: 'perfect',
      grade: 'Perfect',
      exitVelocityMph: 92,
      launchAngleDeg: 28,
      sprayLane: 0,
      perfectPerfect: true,
      strike: false,
      aimError: 0,
      timingDeltaMs: 0
    };
    const flight = simulateFlight(contact, 0.5, DEFAULT_TUNING);
    expect(flight.distanceFt).toBeGreaterThanOrEqual(DEFAULT_TUNING.flight.homeRunDistance);
    expect(flight.isHomeRun).toBe(true);
  });

  it('does not mark weak contact as home run', () => {
    const contact: ContactResult = {
      timing: 'late',
      quality: 'weak',
      grade: 'Late',
      exitVelocityMph: 70,
      launchAngleDeg: 18,
      sprayLane: 0,
      perfectPerfect: false,
      strike: false,
      aimError: 0.6,
      timingDeltaMs: 60
    };
    const flight = simulateFlight(contact, 0.3, DEFAULT_TUNING);
    expect(flight.isHomeRun).toBe(false);
  });
});
