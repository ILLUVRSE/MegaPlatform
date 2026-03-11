import Phaser from 'phaser';
import type { ShotArcParams } from '../types';

interface Dot {
  obj: Phaser.GameObjects.Arc;
}

export class TrajectoryPreview {
  private readonly dots: Dot[] = [];

  constructor(scene: Phaser.Scene, count = 18) {
    for (let i = 0; i < count; i += 1) {
      const dot = scene.add.circle(0, 0, 4, 0x9cc6e8, 0.7).setVisible(false);
      this.dots.push({ obj: dot });
    }
  }

  hide() {
    for (let i = 0; i < this.dots.length; i += 1) {
      this.dots[i].obj.setVisible(false);
    }
  }

  drawArc(arc: ShotArcParams, alpha = 0.8) {
    const count = this.dots.length;
    for (let i = 0; i < count; i += 1) {
      const t = (i + 1) / (count + 2);
      const time = arc.flightTime * t;
      const x = arc.releaseX + arc.velocityX * time;
      const y = arc.releaseY + arc.velocityY * time + 0.5 * arc.gravity * time * time;
      this.dots[i].obj.setPosition(x, y).setVisible(true).setAlpha(alpha * (0.4 + 0.6 * t));
    }
  }
}
