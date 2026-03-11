import { describe, expect, it } from 'vitest';
import { loadChapters } from './story/storyRules';
import { loadAnomalies } from './explore/exploreRules';
import { loadEnemies, loadMissions } from './combat/enemyPatterns';
import { loadItemsCatalog } from './economy/inventory';
import { loadGoodsCatalog } from './economy/goods';
import { loadMarketShocks } from './economy/marketSim';
import { loadUniverse } from './world/universe';
import { loadHullCatalog } from './ship/hulls';
import { loadCosmeticsCatalog } from './ship/cosmetics';
import { loadCrewDialogue } from './crew/crewDialogue';
import { loadWingmen } from './fleet/wingmen';
import { loadDrones } from './fleet/drone';
import { loadEscortMissions } from './fleet/escortMissions';

describe('starlight content validation', () => {
  it('parses required JSON content and meets size constraints', () => {
    const chapters = loadChapters();
    const anomalies = loadAnomalies();
    const enemies = loadEnemies();
    const missions = loadMissions();
    const items = loadItemsCatalog();
    const goods = loadGoodsCatalog();
    const shocks = loadMarketShocks();
    const universe = loadUniverse();
    const hulls = loadHullCatalog();
    const cosmetics = loadCosmeticsCatalog();
    const dialogue = loadCrewDialogue();
    const wingmen = loadWingmen();
    const drones = loadDrones();
    const escort = loadEscortMissions();

    const totalStoryNodes = chapters.reduce((sum, chapter) => sum + chapter.nodes.length, 0);

    expect(chapters.length).toBeGreaterThanOrEqual(3);
    expect(totalStoryNodes).toBeGreaterThanOrEqual(18);
    expect(anomalies.length).toBeGreaterThanOrEqual(10);
    expect(missions.length).toBeGreaterThanOrEqual(6);
    expect(missions.filter((entry) => entry.kind === 'boss').length).toBeGreaterThanOrEqual(2);
    expect(enemies.length).toBeGreaterThanOrEqual(12);
    expect(items.modules.length + items.consumables.length).toBeGreaterThanOrEqual(25);
    expect(goods.goods.length).toBeGreaterThanOrEqual(18);
    expect(shocks.shocks.length).toBeGreaterThanOrEqual(10);
    expect(universe.regions.length).toBeGreaterThanOrEqual(2);
    expect(universe.systems.length).toBeGreaterThanOrEqual(10);
    expect(hulls.hulls.length).toBeGreaterThanOrEqual(6);
    expect(cosmetics.skins.length + cosmetics.decals.length + cosmetics.trails.length).toBeGreaterThanOrEqual(10);
    expect(wingmen.wingmen.length).toBeGreaterThanOrEqual(12);
    expect(drones.drones.length).toBeGreaterThanOrEqual(6);
    expect(escort.escortMissions.length).toBeGreaterThanOrEqual(3);
    expect(dialogue.captain.story?.length ?? 0).toBeGreaterThan(0);

    const ids = [
      ...chapters.flatMap((chapter) => chapter.nodes.map((node) => `${chapter.id}:${node.id}`)),
      ...anomalies.map((entry) => `an:${entry.id}`),
      ...missions.map((entry) => `mi:${entry.id}`),
      ...enemies.map((entry) => `en:${entry.id}`),
      ...items.modules.map((entry) => `mo:${entry.id}`),
      ...items.consumables.map((entry) => `co:${entry.id}`),
      ...items.loot.map((entry) => `lo:${entry.id}`),
      ...goods.goods.map((entry) => `go:${entry.id}`),
      ...shocks.shocks.map((entry) => `sh:${entry.id}`),
      ...universe.regions.map((entry) => `rg:${entry.id}`),
      ...universe.systems.map((entry) => `sy:${entry.id}`),
      ...hulls.hulls.map((entry) => `hu:${entry.id}`),
      ...cosmetics.skins.map((entry) => `sk:${entry.id}`),
      ...cosmetics.decals.map((entry) => `de:${entry.id}`),
      ...cosmetics.trails.map((entry) => `tr:${entry.id}`),
      ...wingmen.wingmen.map((entry) => `wm:${entry.id}`),
      ...drones.drones.map((entry) => `dr:${entry.id}`),
      ...escort.escortMissions.map((entry) => `es:${entry.id}`)
    ];

    expect(new Set(ids).size).toBe(ids.length);
  });
});
