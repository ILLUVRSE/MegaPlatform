import { describe, expect, it } from 'vitest';
import { simulateCrewBootAndNodeHeadless } from './scene';

describe('starlight crew run boot integration', () => {
  it('boots, assigns crew, starts run, and selects node without throwing', () => {
    const result = simulateCrewBootAndNodeHeadless(8080);
    expect(result.ok).toBe(true);
    expect(result.activeCaptain).toBeTruthy();
  });
});
