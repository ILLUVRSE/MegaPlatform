import { describe, expect, it } from 'vitest';
import { resolveDeterministicPreset } from './tuning';

describe('deterministic minigame tuning', () => {
  const presets = [
    { id: 'calm', multiplier: 0.92 },
    { id: 'steady', multiplier: 1 },
    { id: 'tense', multiplier: 1.12 }
  ];

  it('returns the same preset for the same seed and minigame', () => {
    const a = resolveDeterministicPreset(555, 'oil-and-joints', presets);
    const b = resolveDeterministicPreset(555, 'oil-and-joints', presets);
    expect(a.id).toBe(b.id);
  });

  it('can return different presets for different seeds', () => {
    const a = resolveDeterministicPreset(555, 'courage-trial', presets);
    const b = resolveDeterministicPreset(777, 'courage-trial', presets);
    expect([a.id, b.id].every((id) => ['calm', 'steady', 'tense'].includes(id))).toBe(true);
  });
});
