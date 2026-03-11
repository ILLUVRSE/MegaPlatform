import Phaser from 'phaser';
import type { OzVisualTheme } from './theme';
import type { ParticleDensity } from './settings';

export interface VfxOptions {
  reducedMotion: boolean;
  density: ParticleDensity;
}

interface PooledArc {
  shape: Phaser.GameObjects.Arc;
  active: boolean;
}

interface PooledRect {
  shape: Phaser.GameObjects.Rectangle;
  active: boolean;
}

export class OzVfxPool {
  private readonly rings: PooledArc[] = [];
  private readonly blobs: PooledArc[] = [];
  private readonly flecks: PooledRect[] = [];
  private readonly streaks: PooledRect[] = [];

  constructor(private readonly scene: Phaser.Scene, private readonly theme: OzVisualTheme) {
    for (let i = 0; i < 14; i += 1) {
      const ring = scene.add.circle(-200, -200, 8, theme.colors.accent, 0).setDepth(90);
      ring.setStrokeStyle(2, theme.colors.success, 0);
      this.rings.push({ shape: ring, active: false });
    }
    for (let i = 0; i < 22; i += 1) {
      const blob = scene.add.circle(-200, -200, 5, theme.colors.shadow, 0).setDepth(92);
      this.blobs.push({ shape: blob, active: false });
    }
    for (let i = 0; i < 26; i += 1) {
      const fleck = scene.add.rectangle(-200, -200, 6, 3, theme.colors.paper, 0).setDepth(91);
      this.flecks.push({ shape: fleck, active: false });
    }
    for (let i = 0; i < 18; i += 1) {
      const streak = scene.add.rectangle(-200, -200, 16, 2, theme.colors.success, 0).setDepth(93);
      this.streaks.push({ shape: streak, active: false });
    }
  }

  private checkoutArc(pool: PooledArc[]): PooledArc | null {
    for (let i = 0; i < pool.length; i += 1) {
      if (!pool[i].active) {
        pool[i].active = true;
        return pool[i];
      }
    }
    return null;
  }

  private checkoutRect(pool: PooledRect[]): PooledRect | null {
    for (let i = 0; i < pool.length; i += 1) {
      if (!pool[i].active) {
        pool[i].active = true;
        return pool[i];
      }
    }
    return null;
  }

  private releaseArc(item: PooledArc): void {
    item.shape.setVisible(false).setPosition(-200, -200).setAlpha(1).setScale(1).setAngle(0);
    item.active = false;
  }

  private releaseRect(item: PooledRect): void {
    item.shape.setVisible(false).setPosition(-200, -200).setAlpha(1).setScale(1).setAngle(0);
    item.active = false;
  }

  private spawnPaperFleckBurst(x: number, y: number, count: number, radius: number): void {
    for (let i = 0; i < count; i += 1) {
      const fleck = this.checkoutRect(this.flecks);
      if (!fleck) return;
      const angle = (Math.PI * 2 * i) / Math.max(1, count);
      fleck.shape
        .setPosition(x, y)
        .setSize(Phaser.Math.Between(3, 8), Phaser.Math.Between(2, 4))
        .setFillStyle(this.theme.colors.paper, 0.92)
        .setVisible(true)
        .setAngle(Phaser.Math.Between(-22, 22));
      this.scene.tweens.add({
        targets: fleck.shape,
        x: x + Math.cos(angle) * (radius + Phaser.Math.Between(-6, 10)),
        y: y + Math.sin(angle) * (radius + Phaser.Math.Between(-4, 8)),
        alpha: 0,
        duration: Phaser.Math.Between(300, 450),
        ease: 'Quad.Out',
        onComplete: () => this.releaseRect(fleck)
      });
    }
  }

  private spawnInkBurst(x: number, y: number, count: number, color: number, alpha = 0.5): void {
    for (let i = 0; i < count; i += 1) {
      const blob = this.checkoutArc(this.blobs);
      if (!blob) return;
      const angle = Phaser.Math.FloatBetween(-Math.PI, Math.PI);
      const distance = Phaser.Math.FloatBetween(8, 30);
      blob.shape
        .setPosition(x, y)
        .setRadius(Phaser.Math.Between(4, 10))
        .setFillStyle(color, alpha)
        .setVisible(true);
      this.scene.tweens.add({
        targets: blob.shape,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        duration: Phaser.Math.Between(220, 360),
        ease: 'Sine.Out',
        onComplete: () => this.releaseArc(blob)
      });
    }
  }

  tapRipple(x: number, y: number, options: VfxOptions): void {
    if (options.reducedMotion) return;
    const ring = this.checkoutArc(this.rings);
    if (!ring) return;

    ring.shape
      .setPosition(x, y)
      .setRadius(7)
      .setFillStyle(this.theme.colors.accent, 0.12)
      .setStrokeStyle(2, this.theme.colors.accent, 0.55)
      .setVisible(true);
    this.scene.tweens.add({
      targets: ring.shape,
      radius: 30,
      alpha: 0,
      duration: 300,
      ease: 'Sine.Out',
      onComplete: () => {
        this.releaseArc(ring);
      }
    });
    this.spawnPaperFleckBurst(x, y, options.density === 'low' ? 2 : 4, 20);
  }

  sparkle(x: number, y: number, options: VfxOptions): void {
    if (options.reducedMotion) return;
    const count = options.density === 'low' ? 4 : 7;
    for (let i = 0; i < count; i += 1) {
      const streak = this.checkoutRect(this.streaks);
      if (!streak) return;
      const angle = (Math.PI * 2 * i) / count;
      streak.shape
        .setPosition(x, y)
        .setSize(Phaser.Math.Between(10, 18), Phaser.Math.Between(2, 3))
        .setFillStyle(this.theme.colors.success, 0.95)
        .setVisible(true)
        .setAngle(Phaser.Math.RadToDeg(angle));
      this.scene.tweens.add({
        targets: streak.shape,
        x: x + Math.cos(angle) * 34,
        y: y + Math.sin(angle) * 34,
        alpha: 0,
        duration: 340,
        ease: 'Sine.Out',
        onComplete: () => {
          this.releaseRect(streak);
        }
      });
    }
    this.spawnInkBurst(x, y, options.density === 'low' ? 2 : 4, this.theme.colors.accent, 0.4);
    this.spawnPaperFleckBurst(x, y, options.density === 'low' ? 2 : 3, 28);
  }

  inkPuff(x: number, y: number, options: VfxOptions): void {
    if (options.reducedMotion) return;
    this.spawnInkBurst(x, y, options.density === 'low' ? 3 : 6, this.theme.colors.danger, 0.56);
    this.spawnInkBurst(x, y, 2, this.theme.colors.shadow, 0.4);
    this.spawnPaperFleckBurst(x, y, options.density === 'low' ? 1 : 3, 18);
  }
}
