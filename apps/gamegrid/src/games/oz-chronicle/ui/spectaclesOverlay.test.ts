import { describe, expect, it } from 'vitest';
import { createInitialState, type OzChronicleState } from '../rules';
import { isSpectaclesOverlayEnabled } from './spectaclesOverlay';

function withState(state: OzChronicleState, patch: Partial<OzChronicleState>): OzChronicleState {
  return {
    ...state,
    ...patch
  };
}

describe('spectacles overlay toggle logic', () => {
  it('enables overlay only when tint setting is on, spectacles are active, and chapter is a city chapter', () => {
    const base = createInitialState(1881);

    const active = withState(base, {
      settings: { ...base.settings, spectaclesTint: true },
      storyFlags: { ...base.storyFlags, spectaclesOn: true }
    });
    const tintOff = withState(active, {
      settings: { ...active.settings, spectaclesTint: false }
    });
    const storyOff = withState(active, {
      storyFlags: { ...active.storyFlags, spectaclesOn: false }
    });

    expect(isSpectaclesOverlayEnabled(active, 'emerald-city-entry')).toBe(true);
    expect(isSpectaclesOverlayEnabled(active, 'guardian-of-gates')).toBe(false);
    expect(isSpectaclesOverlayEnabled(tintOff, 'emerald-city-entry')).toBe(false);
    expect(isSpectaclesOverlayEnabled(storyOff, 'emerald-city-entry')).toBe(false);
  });
});
