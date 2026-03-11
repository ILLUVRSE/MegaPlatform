import { describe, expect, it } from 'vitest';
import { loadGearCatalog, loadSpotCatalog } from './content';
import { loadEnvironmentDefinition } from './environment';
import { loadFishCatalog } from './fish';
import {
  applyReelInputEvent,
  computeBiteChancePerSecond,
  computeLoadoutModifiers,
  createCastSession,
  createReelState,
  evaluateHookTiming,
  loadLureCatalog,
  replayCastSession,
  stepReelState
} from './rules';

describe('ozark fishing rules', () => {
  it('weights bite chance by depth/weather/zone and spot boost', () => {
    const fish = loadFishCatalog().find((entry) => entry.id === 'largemouth-bass');
    const lure = loadLureCatalog().find((entry) => entry.id === 'spinnerbait');
    const environment = loadEnvironmentDefinition();
    const cove = loadSpotCatalog().find((entry) => entry.id === 'cove');
    const openWater = loadSpotCatalog().find((entry) => entry.id === 'open-water');

    expect(fish).toBeTruthy();
    expect(lure).toBeTruthy();
    expect(cove).toBeTruthy();
    expect(openWater).toBeTruthy();
    if (!fish || !lure || !cove || !openWater) return;

    const coveBite = computeBiteChancePerSecond({
      lure,
      fish,
      environment,
      spot: cove,
      zone: 'weed_bed',
      depth: 'mid',
      weather: 'overcast',
      timeOfDay: 'day',
      lineVisibilityPenalty: 0
    });

    const openBite = computeBiteChancePerSecond({
      lure,
      fish,
      environment,
      spot: openWater,
      zone: 'weed_bed',
      depth: 'mid',
      weather: 'overcast',
      timeOfDay: 'day',
      lineVisibilityPenalty: 0
    });

    expect(coveBite).toBeGreaterThan(openBite);
  });

  it('evaluates hook timing window with forgiveness', () => {
    const perfect = evaluateHookTiming(10, 800, 1);
    const edge = evaluateHookTiming(310, 800, 1.2);
    const miss = evaluateHookTiming(500, 800, 1);

    expect(perfect.success).toBe(true);
    expect(perfect.quality).toBe('perfect');

    expect(edge.success).toBe(true);
    expect(edge.quality === 'good' || edge.quality === 'poor').toBe(true);

    expect(miss.success).toBe(false);
  });

  it('gear modifiers move snap risk and slack recovery in expected direction', () => {
    const gear = loadGearCatalog();
    const lowMods = computeLoadoutModifiers(gear.rods[0], gear.reels[0], gear.lines[0]);
    const highMods = computeLoadoutModifiers(gear.rods[4], gear.reels[4], gear.lines[3]);

    let lowState = createReelState(120);
    let highState = createReelState(120);

    for (let i = 0; i < 180; i += 1) {
      lowState = stepReelState(lowState, {
        dtSec: 1 / 60,
        reelPower: 0.2,
        fishPull: 1.7,
        rodFlexMultiplier: lowMods.rodFlexMultiplier,
        dragSetting: lowMods.dragSetting,
        snapThresholdMultiplier: lowMods.snapThresholdMultiplier,
        slackRecoveryMultiplier: lowMods.slackRecoveryMultiplier
      });
      highState = stepReelState(highState, {
        dtSec: 1 / 60,
        reelPower: 0.2,
        fishPull: 1.7,
        rodFlexMultiplier: highMods.rodFlexMultiplier,
        dragSetting: highMods.dragSetting,
        snapThresholdMultiplier: highMods.snapThresholdMultiplier,
        slackRecoveryMultiplier: highMods.slackRecoveryMultiplier
      });
    }

    expect(highMods.snapThresholdMultiplier).toBeGreaterThan(lowMods.snapThresholdMultiplier);
    expect(highState.slackMs).toBeLessThanOrEqual(lowState.slackMs);
    expect(lowState.outcome === 'snapped' || highState.outcome !== 'snapped').toBe(true);
  });

  it('replays deterministic reel sequence with same seed and inputs', () => {
    const seed = 12345;
    const session = createCastSession(seed, 120);

    for (let i = 0; i < 40; i += 1) {
      applyReelInputEvent(session, i * 33, i % 2 === 0 ? 0.9 : 0.4, 0.82, 0.7, 1.12, 1.05);
    }

    const replayed = replayCastSession(seed, 120, session.eventLog);
    expect(replayed.tension).toBeCloseTo(session.reelState.tension, 8);
    expect(replayed.fishStamina).toBeCloseTo(session.reelState.fishStamina, 8);
    expect(replayed.outcome).toBe(session.reelState.outcome);
  });
});
