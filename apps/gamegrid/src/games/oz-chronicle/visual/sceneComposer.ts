import Phaser from 'phaser';
import { createSeededRng, hashStringToSeed } from '../rng';
import type { BackgroundDetail } from './settings';
import type { OzVisualTheme } from './theme';

export type ComposeZone = 'road' | 'field' | 'city' | 'west' | 'neutral';

type MotifKind = 'road-rut' | 'poppy' | 'emerald-spire' | 'ink-spire' | 'paper-cloud' | 'hatch';

export interface LayerPlan {
  zone: ComposeZone;
  wash: number;
  haze: number;
  props: Array<{ x: number; y: number; w: number; h: number; alpha: number; layer: 0 | 1 | 2; motif: MotifKind }>;
}

interface RenderOptions {
  reducedMotion?: boolean;
}

function detectZone(chapterId: string): ComposeZone {
  const id = chapterId.toLowerCase();
  if (id.includes('emerald') || id.includes('wizard')) return 'city';
  if (id.includes('west') || id.includes('winkie')) return 'west';
  if (id.includes('field') || id.includes('poppy') || id.includes('mice')) return 'field';
  if (id.includes('road') || id.includes('journey')) return 'road';
  return 'neutral';
}

export function buildLayerPlan(seed: number, chapterId: string, detail: BackgroundDetail): LayerPlan {
  const zone = detectZone(chapterId);
  const rng = createSeededRng((seed ^ hashStringToSeed(`oz-compose:${chapterId}:${detail}`)) >>> 0);

  const wash = zone === 'city' ? 0.15 : zone === 'west' ? 0.2 : zone === 'field' ? 0.12 : 0.1;
  const haze = zone === 'west' ? 0.18 : zone === 'city' ? 0.09 : 0.06;

  if (detail === 'off') {
    return { zone, wash, haze, props: [] };
  }

  const count = detail === 'enhanced' ? 14 : 8;
  const motifByZone: Record<ComposeZone, MotifKind[]> = {
    road: ['road-rut', 'paper-cloud', 'hatch'],
    field: ['poppy', 'paper-cloud', 'hatch'],
    city: ['emerald-spire', 'paper-cloud', 'hatch'],
    west: ['ink-spire', 'paper-cloud', 'hatch'],
    neutral: ['paper-cloud', 'hatch', 'road-rut']
  };
  const props: LayerPlan['props'] = [];
  const motifPool = motifByZone[zone];
  for (let i = 0; i < count; i += 1) {
    const layer = (i % 3) as 0 | 1 | 2;
    const motif = motifPool[rng.nextInt(0, motifPool.length)];
    const baseY = layer === 0 ? 270 : layer === 1 ? 410 : 550;
    props.push({
      x: rng.nextInt(80, 1200),
      y: rng.nextInt(baseY - 70, baseY + 120),
      w: rng.nextInt(50, layer === 2 ? 280 : 220),
      h: rng.nextInt(24, layer === 2 ? 190 : 140),
      alpha: Math.max(0.05, Math.min(0.32, rng.next() * (layer === 2 ? 0.3 : 0.24))),
      layer,
      motif
    });
  }

  return { zone, wash, haze, props };
}

export function renderLayerPlan(
  scene: Phaser.Scene,
  host: Phaser.GameObjects.Container,
  theme: OzVisualTheme,
  plan: LayerPlan,
  options: RenderOptions = {}
): void {
  const wash = scene.add.rectangle(640, 360, 1280, 720, theme.colors.accent, plan.wash).setDepth(-20);
  const haze = scene.add.rectangle(640, 360, 1280, 720, theme.colors.shadow, plan.haze).setDepth(-19);
  host.add([wash, haze]);

  const far = scene.add.container(0, 0).setDepth(-18);
  const mid = scene.add.container(0, 0).setDepth(-17);
  const near = scene.add.container(0, 0).setDepth(-16);
  host.add([far, mid, near]);

  const layerHosts: Record<0 | 1 | 2, Phaser.GameObjects.Container> = {
    0: far,
    1: mid,
    2: near
  };

  for (let i = 0; i < plan.props.length; i += 1) {
    const prop = plan.props[i];
    let obj: Phaser.GameObjects.Shape;
    if (prop.motif === 'road-rut') {
      obj = scene.add.ellipse(prop.x, prop.y, prop.w, Math.max(12, Math.round(prop.h * 0.45)), theme.colors.shadow, prop.alpha * 0.8);
      obj.setStrokeStyle(2, theme.colors.ink, Math.min(0.35, prop.alpha + 0.1));
    } else if (prop.motif === 'poppy') {
      obj = scene.add.star(prop.x, prop.y, 6, 6, Math.max(12, prop.w * 0.24), theme.colors.danger, prop.alpha);
      obj.setStrokeStyle(1, theme.colors.ink, Math.min(0.32, prop.alpha + 0.08));
    } else if (prop.motif === 'emerald-spire') {
      obj = scene.add.triangle(
        prop.x,
        prop.y,
        0,
        prop.h,
        prop.w * 0.5,
        0,
        prop.w,
        prop.h,
        theme.colors.accent,
        Math.min(0.35, prop.alpha + 0.04)
      );
      obj.setStrokeStyle(2, theme.colors.ink, Math.min(0.28, prop.alpha + 0.06));
    } else if (prop.motif === 'ink-spire') {
      obj = scene.add.triangle(
        prop.x,
        prop.y,
        0,
        prop.h,
        prop.w * 0.5,
        0,
        prop.w,
        prop.h,
        theme.colors.shadow,
        Math.min(0.4, prop.alpha + 0.08)
      );
      obj.setStrokeStyle(2, theme.colors.ink, Math.min(0.32, prop.alpha + 0.06));
    } else if (prop.motif === 'hatch') {
      obj = scene.add.rectangle(prop.x, prop.y, prop.w, Math.max(8, Math.round(prop.h * 0.2)), theme.colors.ink, prop.alpha * 0.4);
      obj.setStrokeStyle(1, theme.colors.paper, Math.min(0.28, prop.alpha + 0.08));
      obj.setAngle(i % 2 === 0 ? 8 : -8);
    } else {
      obj = scene.add.ellipse(prop.x, prop.y, prop.w, prop.h, theme.colors.paper, prop.alpha);
      obj.setStrokeStyle(1, theme.colors.ink, Math.min(0.24, prop.alpha + 0.06));
    }

    layerHosts[prop.layer].add(obj);
  }

  if (options.reducedMotion) return;

  scene.tweens.add({
    targets: far,
    x: { from: -6, to: 6 },
    duration: 6200,
    ease: 'Sine.InOut',
    yoyo: true,
    repeat: -1
  });
  scene.tweens.add({
    targets: mid,
    x: { from: 8, to: -8 },
    duration: 5200,
    ease: 'Sine.InOut',
    yoyo: true,
    repeat: -1
  });
  scene.tweens.add({
    targets: near,
    x: { from: -12, to: 12 },
    duration: 4300,
    ease: 'Sine.InOut',
    yoyo: true,
    repeat: -1
  });
  scene.tweens.add({
    targets: [wash, haze],
    alpha: { from: 1, to: 0.92 },
    duration: 3400,
    yoyo: true,
    ease: 'Sine.InOut',
    repeat: -1
  });
}

export type { MotifKind };
