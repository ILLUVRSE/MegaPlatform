import type Phaser from 'phaser';
import type { EnemyArchetype, SpawnInstruction, WaveDef } from '../data/starlightTypes';

export interface WaveHooks {
  spawn: (spawn: SpawnInstruction, index: number, total: number, spawnIndex: number) => void;
  onWaveEnd: () => void;
  onMidbossSpawned: () => void;
}

export class WaveDirector {
  private elapsed = 0;
  private cursor = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly wave: WaveDef,
    private readonly enemyLookup: Map<string, EnemyArchetype>,
    private readonly hooks: WaveHooks
  ) {}

  update(dtSec: number): void {
    this.elapsed += dtSec;

    while (this.cursor < this.wave.spawns.length && this.wave.spawns[this.cursor].t <= this.elapsed) {
      const spawn = this.wave.spawns[this.cursor];
      if (this.enemyLookup.has(spawn.enemyId)) {
        for (let index = 0; index < spawn.count; index += 1) {
          this.hooks.spawn(spawn, index, spawn.count, this.cursor);
        }
        if (spawn.midboss) this.hooks.onMidbossSpawned();
      } else {
        // eslint-disable-next-line no-console
        console.warn(`[Starlight] Missing enemy archetype: ${spawn.enemyId}`);
      }
      this.cursor += 1;
    }

    if (this.elapsed >= this.wave.durationSec && this.cursor >= this.wave.spawns.length) {
      this.hooks.onWaveEnd();
      this.scene.events.off('update', this.update, this);
    }
  }

  getElapsed(): number {
    return this.elapsed;
  }

  getSpawnIndex(): number {
    return this.cursor;
  }

  getSpawnCount(): number {
    return this.wave.spawns.length;
  }
}
