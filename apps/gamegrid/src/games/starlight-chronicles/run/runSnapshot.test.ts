import { describe, expect, it } from 'vitest';
import { createInitialProfile } from '../rules';
import { generateStarMap } from './runGen';
import { createRunState } from './runRules';
import { createRunSnapshot, deserializeRunSnapshot, serializeRunSnapshot } from './runSnapshot';

describe('starlight run snapshot', () => {
  it('round trips serialize and deserialize', () => {
    const profile = createInitialProfile(42);
    const graph = generateStarMap(42, 'diplomacy');
    const run = createRunState(42, 'normal', 'diplomacy');
    const snapshot = createRunSnapshot(profile, graph, run);

    const serialized = serializeRunSnapshot(snapshot);
    const restored = deserializeRunSnapshot(serialized);

    expect(restored).toEqual(snapshot);
    expect(restored.worldContext.systemId).toBe(profile.currentSystemId);
    expect(Array.isArray(restored.worldContext.marketShockIds)).toBe(true);
    expect(restored.shipConfig.activeHullId).toBe(profile.activeHullId);
    expect(typeof restored.shipConfig.cosmetics.skinKey).toBe('string');
    expect(Array.isArray(restored.shipConfig.activeWingmenIds)).toBe(true);
    expect(typeof restored.shipConfig.activeDroneId === 'string' || restored.shipConfig.activeDroneId === null).toBe(true);
    expect(Array.isArray(restored.shipConfig.patrolContextIds)).toBe(true);
    expect(serialized.length).toBeLessThan(12000);
  });
});
