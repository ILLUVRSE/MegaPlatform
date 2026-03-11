import type { EnemyDefinition, MissionDefinition } from './enemyPatterns';
import { buildWaveSpawns } from './enemyPatterns';
import { createSeededRng } from '../rng';

export interface SimEnemy {
  id: string;
  hp: number;
  x: number;
  y: number;
}

export interface CombatSimState {
  waveIndex: number;
  spawnedInWave: number;
  elapsedMs: number;
  activeEnemies: SimEnemy[];
}

export function createCombatSimState(): CombatSimState {
  return {
    waveIndex: 0,
    spawnedInWave: 0,
    elapsedMs: 0,
    activeEnemies: []
  };
}

export function stepCombatSim(state: CombatSimState, mission: MissionDefinition, enemies: EnemyDefinition[], deltaMs: number, seed: number): CombatSimState {
  const wave = mission.waves[state.waveIndex];
  if (!wave) return state;

  const next: CombatSimState = {
    ...state,
    elapsedMs: state.elapsedMs + deltaMs,
    activeEnemies: state.activeEnemies.slice()
  };

  if (state.spawnedInWave < wave.count && (wave.spawnIntervalMs === 0 || next.elapsedMs >= wave.spawnIntervalMs)) {
    const spawn = buildWaveSpawns(wave, state.spawnedInWave, 1280);
    const def = enemies.find((entry) => entry.id === spawn.enemyId);
    if (def) {
      next.activeEnemies.push({ id: def.id, hp: def.hp, x: spawn.x, y: spawn.y });
    }
    next.spawnedInWave += 1;
    next.elapsedMs = 0;
  }

  const rng = createSeededRng(seed ^ (state.waveIndex + 31));
  for (let i = 0; i < next.activeEnemies.length; i += 1) {
    next.activeEnemies[i].y += 22 + rng.nextInt(0, 6);
  }

  return next;
}
