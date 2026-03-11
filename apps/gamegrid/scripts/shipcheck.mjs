import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function exists(relPath) {
  return fs.existsSync(path.join(cwd, relPath));
}

function main() {
  const packageJsonPath = path.join(cwd, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  if (pkg.scripts?.lint) {
    run('npm run lint');
  } else {
    console.log('Skipping lint: no lint script present.');
  }

  run('npm test');
  run('npm run build');

  const requiredDocs = [
    'docs/embed.md',
    'docs/deploy.md',
    'docs/ads.md',
    'docs/shipping.md',
    'docs/portal.md',
    'docs/pixelpuck.md',
    'docs/minigolf.md',
    'docs/freethrow-frenzy.md',
    'docs/homerun-derby.md',
    'docs/table-tennis.md',
    'docs/foosball.md',
    'docs/pool.md',
    'docs/ozark-fishing.md',
    'docs/ozark-fishing-assets.md',
    'docs/ozark-fishing-content.md',
    'docs/ozark-fishing-liveops.md',
    'docs/ozark-fishing-tournaments.md',
    'docs/penalty-kick-showdown.md',
    'docs/goalie-gauntlet.md',
    'docs/goalie-gauntlet-career.md',
    'docs/alley-bowling-blitz.md',
    'docs/starlight-chronicles.md',
    'docs/starlight-chronicles-economy.md',
    'docs/starlight-chronicles-ships.md',
    'docs/starlight-chronicles-fleet.md',
    'docs/starlight-chronicles-multiplayer.md',
    'docs/SORTIE_TUNING.md',
    'docs/ECONOMY_BALANCE.md',
    'docs/HANGAR_UX.md',
    'docs/DATA_SCHEMAS.md',
    'docs/oz-chronicle.md',
    'docs/multiplayer.md',
    'docs/addictinggames.md'
  ];
  for (const doc of requiredDocs) {
    assert(exists(doc), `Missing required doc: ${doc}`);
  }

  assert(exists('src/systems/postMessageBridge.ts'), 'Embed bridge module missing: src/systems/postMessageBridge.ts');
  assert(exists('src/mp/transport.ts'), 'Multiplayer transport missing: src/mp/transport.ts');
  assert(exists('src/mp/protocol.ts'), 'Multiplayer protocol missing: src/mp/protocol.ts');
  assert(exists('src/mp/room.ts'), 'Multiplayer room state missing: src/mp/room.ts');

  const constants = fs.readFileSync(path.join(cwd, 'src/systems/constants.ts'), 'utf8');
  assert(
    /DEBUG_HUD_DEFAULT\s*=\s*false/.test(constants),
    'Debug HUD default must be OFF (DEBUG_HUD_DEFAULT = false)'
  );

  const registry = fs.readFileSync(path.join(cwd, 'src/registry/games.ts'), 'utf8');
  const requiredIds = [
    'pixelpuck',
    'throw-darts',
    'minigolf',
    'freethrow-frenzy',
    'homerun-derby',
    'table-tennis',
    'foosball',
    'pool',
    'card-table',
    'penalty-kick-showdown',
    'goalie-gauntlet',
    'alley-bowling-blitz',
    'ozark-fishing',
    'starlight-chronicles',
    'oz-chronicle'
  ];

  for (const id of requiredIds) {
    assert(registry.includes(`'${id}'`), `Registry missing required game id: ${id}`);
  }

  assert(
    /id:\s*'freethrow-frenzy'[\s\S]*?status:\s*'live'/.test(registry),
    'freethrow-frenzy must be marked live in registry'
  );
  assert(/id:\s*'homerun-derby'[\s\S]*?status:\s*'live'/.test(registry), 'homerun-derby must be marked live in registry');
  assert(/id:\s*'table-tennis'[\s\S]*?status:\s*'live'/.test(registry), 'table-tennis must be marked live in registry');
  assert(/id:\s*'foosball'[\s\S]*?status:\s*'live'/.test(registry), 'foosball must be marked live in registry');
  assert(/id:\s*'pool'[\s\S]*?status:\s*'live'/.test(registry), 'pool must be marked live in registry');
  assert(/id:\s*'card-table'[\s\S]*?status:\s*'live'/.test(registry), 'card-table must be marked live in registry');
  assert(
    /id:\s*'penalty-kick-showdown'[\s\S]*?status:\s*'live'/.test(registry),
    'penalty-kick-showdown must be marked live in registry'
  );
  assert(/id:\s*'goalie-gauntlet'[\s\S]*?status:\s*'live'/.test(registry), 'goalie-gauntlet must be marked live in registry');
  assert(
    /id:\s*'alley-bowling-blitz'[\s\S]*?status:\s*'live'/.test(registry),
    'alley-bowling-blitz must be marked live in registry'
  );
  assert(
    /id:\s*'starlight-chronicles'[\s\S]*?status:\s*'live'/.test(registry),
    'starlight-chronicles must be marked live in registry'
  );
  assert(/id:\s*'oz-chronicle'[\s\S]*?status:\s*'live'/.test(registry), 'oz-chronicle must be marked live in registry');

  const appFile = fs.readFileSync(path.join(cwd, 'src/App.tsx'), 'utf8');
  assert(appFile.includes('path=\"/play/:gameId\"'), 'Deep link route missing: /play/:gameId');

  const adapterRegistry = fs.readFileSync(path.join(cwd, 'src/mp/adapters/index.ts'), 'utf8');
  for (const id of requiredIds) {
    assert(adapterRegistry.includes(`'${id}'`) || adapterRegistry.includes(`${id}:`), `Adapter registry missing game id: ${id}`);
  }
  assert(!adapterRegistry.includes('implemented: false'), 'All multiplayer adapters must be marked implemented: true');

  const coverageFile = fs.readFileSync(path.join(cwd, 'src/mp/coverage.ts'), 'utf8');
  const expectedRealtime = [
    'pixelpuck',
    'table-tennis',
    'foosball',
    'goalie-gauntlet',
    'penalty-kick-showdown',
    'ozark-fishing',
    'starlight-chronicles',
    'oz-chronicle'
  ];
  const expectedTurnBased = [
    'throw-darts',
    'minigolf',
    'freethrow-frenzy',
    'homerun-derby',
    'pool',
    'alley-bowling-blitz',
    'card-table'
  ];
  for (const id of expectedRealtime) {
    assert(coverageFile.includes(`'${id}'`), `Realtime multiplayer coverage missing game: ${id}`);
  }
  for (const id of expectedTurnBased) {
    assert(coverageFile.includes(`'${id}'`), `Turn-based multiplayer coverage missing game: ${id}`);
  }
  assert(coverageFile.includes('STUB_SAFE_MP_GAMES'), 'Stub-safe multiplayer coverage list missing');
  assert(coverageFile.includes("'starlight-chronicles'"), 'starlight-chronicles must be present in multiplayer coverage');
  assert(coverageFile.includes("'oz-chronicle'"), 'oz-chronicle must be present in multiplayer coverage');

  assert(exists('src/content/starlight-chronicles/chapters.json'), 'Missing Starlight chapters content');
  assert(exists('src/content/starlight-chronicles/anomalies.json'), 'Missing Starlight anomalies content');
  assert(exists('src/content/starlight-chronicles/missions.json'), 'Missing Starlight missions content');
  assert(exists('src/content/starlight-chronicles/enemies.json'), 'Missing Starlight enemies content');
  assert(exists('src/content/starlight-chronicles/items.json'), 'Missing Starlight items content');
  assert(exists('src/content/starlight-chronicles/universe.json'), 'Missing Starlight universe content');
  assert(exists('src/content/starlight-chronicles/goods.json'), 'Missing Starlight goods content');
  assert(exists('src/content/starlight-chronicles/market-shocks.json'), 'Missing Starlight market shocks content');
  assert(exists('src/content/starlight-chronicles/hulls.json'), 'Missing Starlight hulls content');
  assert(exists('src/content/starlight-chronicles/cosmetics.json'), 'Missing Starlight cosmetics content');
  assert(exists('src/content/starlight-chronicles/dialogue.json'), 'Missing Starlight dialogue content');
  assert(exists('src/content/starlight-chronicles/wingmen.json'), 'Missing Starlight wingmen content');
  assert(exists('src/content/starlight-chronicles/drones.json'), 'Missing Starlight drones content');
  assert(exists('src/content/starlight-chronicles/escort-missions.json'), 'Missing Starlight escort missions content');
  assert(exists('src/mp/adapters/starlight-chronicles.ts'), 'Missing Starlight multiplayer adapter stub');
  assert(exists('src/content/oz-chronicle/chapters.json'), 'Missing oz-chronicle chapters content');
  assert(exists('src/content/oz-chronicle/glossary.json'), 'Missing oz-chronicle glossary content');
  assert(exists('src/content/oz-chronicle/minigames.json'), 'Missing oz-chronicle minigames content');
  assert(exists('src/content/oz-chronicle/artPalette.json'), 'Missing oz-chronicle art palette content');
  assert(exists('src/content/oz-chronicle/sketches.json'), 'Missing oz-chronicle sketches content');
  assert(exists('src/mp/adapters/oz-chronicle.ts'), 'Missing oz-chronicle multiplayer adapter stub');
  assert(exists('src/content/goalie-gauntlet-patterns.json'), 'Missing goalie-gauntlet patterns content');
  assert(exists('src/content/goalie-gauntlet-challenges.json'), 'Missing goalie-gauntlet challenges content');
  assert(exists('src/content/goalie-gauntlet-career.json'), 'Missing goalie-gauntlet career content');
  assert(exists('src/content/goalie-gauntlet-cosmetics.json'), 'Missing goalie-gauntlet cosmetics content');
  assert(exists('src/content/goalie-gauntlet-achievements.json'), 'Missing goalie-gauntlet achievements content');
  const mpTests = [
    'src/mp/pixelpuck.integration.test.ts',
    'src/mp/tabletennis.integration.test.ts',
    'src/mp/foosball.integration.test.ts',
    'src/mp/goalie-gauntlet.integration.test.ts',
    'src/mp/penalty-kick-showdown.integration.test.ts',
    'src/mp/throw-darts.integration.test.ts',
    'src/mp/minigolf.integration.test.ts',
    'src/mp/freethrow-frenzy.integration.test.ts',
    'src/mp/homerun-derby.integration.test.ts',
    'src/mp/pool.integration.test.ts',
    'src/mp/alley-bowling-blitz.integration.test.ts',
    'src/mp/card-table.integration.test.ts',
    'src/mp/ozark-fishing.integration.test.ts',
    'src/mp/starlight-chronicles.integration.test.ts',
    'src/mp/starlight-chronicles.coop-boss.integration.test.ts'
  ];
  for (const testFile of mpTests) {
    assert(exists(testFile), `Missing multiplayer integration test: ${testFile}`);
  }

  const requiredAssets = [
    'public/thumbnail-720x468.png',
    'public/video-thumb-275x157.mp4',
    'public/og-image.png',
    'public/icons/sprite.svg'
  ];
  for (const asset of requiredAssets) {
    assert(exists(asset), `Missing required asset: ${asset}`);
  }

  const ozarkVisualContent = [
    'src/content/ozark-fish-visuals.json',
    'src/content/ozark-cosmetics.json',
    'src/content/ozark-environment-visuals.json',
    'public/ozark/fish-atlas.png',
    'public/ozark/fish-atlas.json'
  ];
  for (const file of ozarkVisualContent) {
    assert(exists(file), `Missing Ozark visual content asset: ${file}`);
  }

  const ozarkEnvAssets = [
    'public/ozark/env/silhouettes/treeline-cove.svg',
    'public/ozark/env/silhouettes/treeline-dock.svg',
    'public/ozark/env/silhouettes/hills-open.svg',
    'public/ozark/env/silhouettes/treeline-river.svg',
    'public/ozark/env/props/lily-pad.svg',
    'public/ozark/env/props/reeds.svg',
    'public/ozark/env/props/dock-post.svg',
    'public/ozark/env/props/rope-float.svg',
    'public/ozark/env/props/island.svg',
    'public/ozark/env/props/current-streak.svg',
    'public/ozark/env/props/driftwood.svg',
    'public/ozark/env/clouds/cloud-1.svg',
    'public/ozark/env/clouds/cloud-2.svg',
    'public/ozark/env/clouds/cloud-3.svg',
    'public/ozark/env/particles/mist.svg',
    'public/ozark/env/particles/firefly.svg',
    'public/ozark/env/particles/snowflake.svg',
    'public/ozark/env/previews/cove.svg',
    'public/ozark/env/previews/dock.svg',
    'public/ozark/env/previews/open-water.svg',
    'public/ozark/env/previews/river-mouth.svg'
  ];
  for (const file of ozarkEnvAssets) {
    assert(exists(file), `Missing Ozark environment asset: ${file}`);
  }

  const requiredStarlightScenes = [
    'src/scenes/Boot.ts',
    'src/scenes/Preload.ts',
    'src/scenes/MainMenu.ts',
    'src/scenes/Hangar.ts',
    'src/scenes/MissionSelect.ts',
    'src/scenes/PerkPick.ts',
    'src/scenes/Sortie.ts',
    'src/scenes/Results.ts'
  ];
  for (const file of requiredStarlightScenes) {
    assert(exists(file), `Missing required Starlight scene file: ${file}`);
  }

  const launcher = fs.readFileSync(path.join(cwd, 'src/scenes/starlightLauncher.ts'), 'utf8');
  for (const key of ['BootScene', 'PreloadScene', 'MainMenuScene', 'HangarScene', 'MissionSelectScene', 'PerkPickScene', 'SortieScene', 'ResultsScene']) {
    assert(launcher.includes(key), `Starlight launcher missing scene wiring: ${key}`);
  }

  for (const file of [
    'src/data/starlightModules.ts',
    'src/data/starlightPerks.ts',
    'src/data/starlightEnemies.ts',
    'src/data/starlightWaves.ts',
    'src/data/starlightMissions.ts'
  ]) {
    assert(exists(file), `Missing Starlight data file: ${file}`);
  }

  const modulesData = fs.readFileSync(path.join(cwd, 'src/data/starlightModules.ts'), 'utf8');
  const perksData = fs.readFileSync(path.join(cwd, 'src/data/starlightPerks.ts'), 'utf8');
  const enemiesData = fs.readFileSync(path.join(cwd, 'src/data/starlightEnemies.ts'), 'utf8');
  assert((modulesData.match(/id:\s*'/g) ?? []).length >= 12, 'Expected at least 12 modules in starlightModules.ts');
  assert((perksData.match(/id:\s*'/g) ?? []).length >= 9, 'Expected at least 9 perks in starlightPerks.ts');
  assert((enemiesData.match(/id:\s*'/g) ?? []).length >= 6, 'Expected at least 6 enemies in starlightEnemies.ts');

  const saveSystem = fs.readFileSync(path.join(cwd, 'src/systems/starlightSave.ts'), 'utf8');
  const saveSchemaKeys = ['version', 'credits', 'inventory', 'equippedSlots', 'unlocks', 'bossKills', 'activeRun'];
  for (const key of saveSchemaKeys) {
    assert(saveSystem.includes(`${key}:`), `Save schema missing key in starlightSave.ts: ${key}`);
  }

  const missionsData = fs.readFileSync(path.join(cwd, 'src/data/starlightMissions.ts'), 'utf8');
  assert((missionsData.match(/id:\s*'s1-m/g) ?? []).length >= 3, 'Sector 1 must include 3 missions');
  assert(/id:\s*'s1-m2'[\s\S]*midbossAtSec:\s*\d+/.test(missionsData), 'Mission 2 must include midboss definition');
  assert(/id:\s*'s1-m3'[\s\S]*finalBossId:\s*'prism-warden'[\s\S]*signatureRewardId:\s*'sig-prism-breaker'/.test(missionsData), 'Mission 3 must include Prism Warden boss + signature reward');

  const stateFile = fs.readFileSync(path.join(cwd, 'src/scenes/starlightState.ts'), 'utf8');
  assert(stateFile.includes('Primary weapon required'), 'Launch validation must block missing primary weapon');
  assert(stateFile.includes('Power budget exceeded'), 'Launch validation must block power-over-budget loadout');
  assert(stateFile.includes('selectedPerkId'), 'Run state must track selectedPerkId');
  assert(stateFile.includes('isRunReady'), 'Run readiness gate missing');

  const sortieFile = fs.readFileSync(path.join(cwd, 'src/scenes/Sortie.ts'), 'utf8');
  assert(sortieFile.includes('isRunReady'), 'Sortie must gate entry on run readiness');
  assert(sortieFile.includes('SCENE_KEYS.perkPick'), 'Sortie must redirect to PerkPick when perk not selected');

  console.log('\nShipcheck passed.');
}

try {
  main();
} catch (error) {
  console.error('\nShipcheck failed.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
