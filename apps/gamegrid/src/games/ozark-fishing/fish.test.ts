import { describe, expect, it } from 'vitest';
import { loadSpotCatalog } from './content';
import { loadEnvironmentDefinition } from './environment';
import {
  computeFishInterestScore,
  createFishAgentPool,
  createHookedFish,
  loadFishCatalog,
  stepFishAiAgents
} from './fish';
import { loadLureCatalog } from './rules';

describe('ozark fishing fish AI', () => {
  it('raises interest score for preferred depth/time/weather/zone/spot', () => {
    const fish = loadFishCatalog().find((entry) => entry.id === 'channel-catfish');
    const lure = loadLureCatalog().find((entry) => entry.id === 'cat-cutbait');
    const env = loadEnvironmentDefinition();
    const spot = loadSpotCatalog().find((entry) => entry.id === 'open-water');

    expect(fish).toBeTruthy();
    expect(lure).toBeTruthy();
    expect(spot).toBeTruthy();
    if (!fish || !lure || !spot) return;

    const preferred = computeFishInterestScore({
      fish,
      lure,
      environment: env,
      spot,
      zone: 'deep_dropoff',
      depth: 'deep',
      weather: 'light_rain',
      timeOfDay: 'night',
      lineVisibilityPenalty: 0,
      lureDistanceNorm: 0.04
    });

    const poor = computeFishInterestScore({
      fish,
      lure,
      environment: env,
      spot,
      zone: 'shoreline',
      depth: 'shallow',
      weather: 'sunny',
      timeOfDay: 'day',
      lineVisibilityPenalty: 0.3,
      lureDistanceNorm: 0.62
    });

    expect(preferred).toBeGreaterThan(poor);
  });

  it('muskie investigation hesitates with circling before strike', () => {
    const fish = loadFishCatalog().find((entry) => entry.id === 'ozark-muskie');
    const lure = loadLureCatalog().find((entry) => entry.id === 'muskie-magnum') ?? loadLureCatalog()[0];
    const env = loadEnvironmentDefinition();
    const spot = loadSpotCatalog().find((entry) => entry.id === 'open-water');

    expect(fish).toBeTruthy();
    expect(spot).toBeTruthy();
    if (!fish || !spot) return;

    const pool = createFishAgentPool(1);
    const agent = pool[0];
    agent.active = true;
    agent.fish = fish;
    agent.state = 'investigating';
    agent.timerSec = 0;
    agent.detectRadius = 0.7;

    const ctx = {
      fish,
      lure,
      environment: env,
      spot,
      zone: 'deep_dropoff' as const,
      depth: 'deep' as const,
      weather: 'light_rain' as const,
      timeOfDay: 'night' as const,
      lineVisibilityPenalty: 0,
      lureDistanceNorm: 0.01
    };

    const rng = () => 0.99;

    const first = stepFishAiAgents(pool, () => ctx, 0.4, rng);
    const second = stepFishAiAgents(pool, () => ctx, 0.4, rng);
    const third = stepFishAiAgents(pool, () => ctx, 0.4, rng);

    expect(first).toBeNull();
    expect(second).toBeNull();
    expect(third).toBeTruthy();
    expect(agent.circlingPasses).toBeGreaterThanOrEqual(3);
    expect(agent.state).toBe('strike');
  });

  it('hook quality scales stamina, aggression, and escape risk', () => {
    const fish = loadFishCatalog().find((entry) => entry.id === 'walleye');
    expect(fish).toBeTruthy();
    if (!fish) return;

    const poor = createHookedFish(fish, 'poor', 0.5);
    const perfect = createHookedFish(fish, 'perfect', 0.5);

    expect(perfect.staminaMax).toBeLessThan(poor.staminaMax);
    expect(perfect.aggression).toBeLessThan(poor.aggression);
    expect(perfect.escapeRisk).toBeLessThan(poor.escapeRisk);
  });
});
