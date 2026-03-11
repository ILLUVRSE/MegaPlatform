import Phaser from 'phaser';
import { loadFishVisualCatalog } from './content';
import type { FishAgent, FishVisualDefinition, HookedFish } from './types';

export type FishAnimState = 'idle' | 'bite' | 'thrash' | 'exhausted';

interface RenderFishInstance {
  inUse: boolean;
  speciesId: string;
  x: number;
  y: number;
  depthNorm: number;
  length: number;
  height: number;
  wag: number;
  colorBody: number;
  colorAccent: number;
  silhouette: FishVisualDefinition['silhouette'];
  aura: FishVisualDefinition['rarityEffects']['aura'];
}

const POOL_SIZE = 20;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pickStateForBehavior(hooked: HookedFish): FishAnimState {
  if (hooked.stamina < hooked.staminaMax * 0.2) return 'exhausted';
  if (hooked.behavior === 'thrash' || hooked.behavior === 'run_left' || hooked.behavior === 'run_right') return 'thrash';
  return 'bite';
}

function hexToNumber(hex: string): number {
  return Number.parseInt(hex.slice(1), 16);
}

export class FishSpritePool {
  private readonly pool: RenderFishInstance[];

  constructor(size = POOL_SIZE) {
    this.pool = Array.from({ length: size }, () => ({
      inUse: false,
      speciesId: '',
      x: 0,
      y: 0,
      depthNorm: 0,
      length: 0,
      height: 0,
      wag: 0,
      colorBody: 0x9ec9d8,
      colorAccent: 0xbde4f4,
      silhouette: 'bass',
      aura: 'none'
    }));
  }

  reset(): void {
    for (let i = 0; i < this.pool.length; i += 1) this.pool[i].inUse = false;
  }

  acquire(): RenderFishInstance | null {
    for (let i = 0; i < this.pool.length; i += 1) {
      if (this.pool[i].inUse) continue;
      this.pool[i].inUse = true;
      return this.pool[i];
    }
    return null;
  }

  release(instance: RenderFishInstance): void {
    instance.inUse = false;
  }

  getItems(): readonly RenderFishInstance[] {
    return this.pool;
  }
}

export class FishRenderSystem {
  private readonly visuals: Record<string, FishVisualDefinition>;
  private readonly pool: FishSpritePool;

  constructor(pool = new FishSpritePool()) {
    this.visuals = loadFishVisualCatalog();
    this.pool = pool;
  }

  getVisualForSpecies(speciesId: string): FishVisualDefinition {
    return this.visuals[speciesId] ?? this.visuals['largemouth-bass'];
  }

  chooseSpriteKey(speciesId: string, state: FishAnimState): string {
    const visual = this.getVisualForSpecies(speciesId);
    if (state === 'idle') return visual.spriteKeys.idle;
    if (state === 'bite') return visual.spriteKeys.bite;
    if (state === 'thrash') return visual.spriteKeys.thrash;
    return visual.spriteKeys.exhausted;
  }

  renderAmbient(graphics: Phaser.GameObjects.Graphics, agents: readonly FishAgent[], visualTimeSec: number): void {
    this.pool.reset();
    for (let i = 0; i < agents.length; i += 1) {
      const agent = agents[i];
      if (!agent.active) continue;
      const visual = this.getVisualForSpecies(agent.fish.id);
      const entry = this.pool.acquire();
      if (!entry) break;
      const x = 210 + i * 152 + Math.sin(visualTimeSec * 0.9 + i * 0.8 + agent.timerSec * 2.4) * 34;
      const y = 260 + i * 40 + Math.sin(visualTimeSec * 1.4 + i * 0.44) * 10;
      const speed = 0.4 + clamp(agent.interest, 0, 1.8) * 0.22;
      const wag = Math.sin(visualTimeSec * 11 * visual.animSpeed.idle * speed + i) * 5;

      const sizeScale = visual.sizeScaleByPercentile.p50;
      entry.speciesId = agent.fish.id;
      entry.x = x;
      entry.y = y;
      entry.depthNorm = clamp((y - 120) / 500, 0, 1);
      entry.length = (18 + agent.fish.difficulty * 7) * sizeScale;
      entry.height = (8 + agent.fish.difficulty * 2.6) * sizeScale;
      entry.wag = wag;
      entry.colorBody = hexToNumber(visual.baseColors[0]);
      entry.colorAccent = hexToNumber(visual.patternAccents[0]);
      entry.silhouette = visual.silhouette;
      entry.aura = visual.rarityEffects.aura;
    }

    this.renderFromPool(graphics, visualTimeSec);
  }

  renderHooked(graphics: Phaser.GameObjects.Graphics, hooked: HookedFish, x: number, y: number, visualTimeSec: number): void {
    const visual = this.getVisualForSpecies(hooked.fish.id);
    const state = pickStateForBehavior(hooked);
    const wagAmp = state === 'thrash' ? 10 : state === 'exhausted' ? 2 : 6;
    const wag = Math.sin(visualTimeSec * visual.animSpeed[state] * 17) * wagAmp;
    const staminaPct = clamp(hooked.stamina / Math.max(1, hooked.staminaMax), 0, 1);
    const weightPct = clamp((hooked.weightLb - hooked.fish.minWeightLb) / Math.max(0.001, hooked.fish.maxWeightLb - hooked.fish.minWeightLb), 0, 1);
    const scale = weightPct >= 0.95 ? visual.sizeScaleByPercentile.p95 : weightPct >= 0.9 ? visual.sizeScaleByPercentile.p90 : weightPct <= 0.1 ? visual.sizeScaleByPercentile.p10 : visual.sizeScaleByPercentile.p50;

    graphics.fillStyle(0x000000, 0.2);
    graphics.fillEllipse(x, y + 10, 34 * scale, 9 * scale);
    this.drawFishSilhouette(graphics, visual.silhouette, x, y - (1 - staminaPct) * 3, 32 * scale, 12 * scale, wag, hexToNumber(visual.baseColors[0]), hexToNumber(visual.patternAccents[0]));
    if (visual.rarityEffects.aura !== 'none') {
      const auraColor = visual.rarityEffects.aura === 'gold' ? 0xffdb80 : 0xb9e8ff;
      graphics.lineStyle(1.2, auraColor, visual.rarityEffects.aura === 'gold' ? 0.32 : 0.2);
      graphics.strokeEllipse(x, y - 2, 36 * scale, 16 * scale);
    }
  }

  getPool(): FishSpritePool {
    return this.pool;
  }

  private renderFromPool(graphics: Phaser.GameObjects.Graphics, visualTimeSec: number): void {
    const items = this.pool.getItems();
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (!item.inUse) continue;

      const shadowWidth = item.length * (0.6 + item.depthNorm * 0.3);
      const shadowHeight = item.height * (0.34 + item.depthNorm * 0.18);
      graphics.fillStyle(0x000000, 0.1 + item.depthNorm * 0.12);
      graphics.fillEllipse(item.x, item.y + 9, shadowWidth, shadowHeight);

      this.drawFishSilhouette(graphics, item.silhouette, item.x, item.y, item.length, item.height, item.wag, item.colorBody, item.colorAccent);
      if (item.aura !== 'none') {
        const auraColor = item.aura === 'gold' ? 0xffe0a0 : 0xb8e8ff;
        graphics.lineStyle(1, auraColor, item.aura === 'gold' ? 0.22 : 0.14 + Math.sin(visualTimeSec * 2.6 + i) * 0.03);
        graphics.strokeEllipse(item.x, item.y, item.length * 1.12, item.height * 1.06);
      }

      this.pool.release(item);
    }
  }

  private drawFishSilhouette(
    graphics: Phaser.GameObjects.Graphics,
    silhouette: FishVisualDefinition['silhouette'],
    x: number,
    y: number,
    length: number,
    height: number,
    wag: number,
    bodyColor: number,
    accentColor: number
  ): void {
    graphics.fillStyle(bodyColor, 0.76);
    if (silhouette === 'catfish') {
      graphics.fillEllipse(x, y, length * 1.1, height * 0.9);
      graphics.fillTriangle(x - length * 0.45, y, x - length * 0.8 - wag * 0.18, y - height * 0.44, x - length * 0.8 - wag * 0.18, y + height * 0.44);
      graphics.lineStyle(1, accentColor, 0.5);
      graphics.beginPath();
      graphics.moveTo(x + length * 0.44, y + 1);
      graphics.lineTo(x + length * 0.64, y + 5);
      graphics.strokePath();
      graphics.beginPath();
      graphics.moveTo(x + length * 0.44, y - 1);
      graphics.lineTo(x + length * 0.64, y - 5);
      graphics.strokePath();
    } else if (silhouette === 'gar' || silhouette === 'paddlefish') {
      graphics.fillEllipse(x, y, length * 1.26, height * 0.62);
      graphics.fillTriangle(x - length * 0.5, y, x - length * 0.92 - wag * 0.15, y - height * 0.3, x - length * 0.92 - wag * 0.15, y + height * 0.3);
      graphics.fillStyle(accentColor, 0.58);
      graphics.fillEllipse(x + length * 0.4, y, length * 0.18, height * 0.22);
    } else if (silhouette === 'panfish') {
      graphics.fillEllipse(x, y, length * 0.86, height * 1.14);
      graphics.fillTriangle(x - length * 0.36, y, x - length * 0.62 - wag * 0.16, y - height * 0.45, x - length * 0.62 - wag * 0.16, y + height * 0.45);
      graphics.fillStyle(accentColor, 0.54);
      graphics.fillEllipse(x + length * 0.12, y, length * 0.28, height * 0.52);
    } else {
      graphics.fillEllipse(x, y, length, height);
      graphics.fillTriangle(x - length * 0.5, y, x - length * 0.75 - wag * 0.2, y - height * 0.38, x - length * 0.75 - wag * 0.2, y + height * 0.38);
      graphics.fillStyle(accentColor, 0.5);
      graphics.fillEllipse(x + length * 0.06, y, length * 0.52, height * 0.44);
    }

    graphics.fillStyle(0xffffff, 0.42);
    graphics.fillCircle(x + length * 0.24, y - 1, 1.1);
  }
}
