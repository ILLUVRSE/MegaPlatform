import Phaser from 'phaser';

interface TrailDot {
  dot: Phaser.GameObjects.Arc;
  life: number;
  ttl: number;
}

export class TrailPool {
  private readonly dots: TrailDot[];

  constructor(scene: Phaser.Scene, count: number) {
    this.dots = [];
    for (let i = 0; i < count; i += 1) {
      this.dots.push({
        dot: scene.add.circle(0, 0, 2.6, 0xfff5cd, 0).setVisible(false),
        life: 0,
        ttl: 0
      });
    }
  }

  spawn(x: number, y: number, life: number, color: number) {
    for (let i = 0; i < this.dots.length; i += 1) {
      const dot = this.dots[i];
      if (dot.life > 0) continue;
      dot.life = life;
      dot.ttl = life;
      dot.dot.setPosition(x, y).setVisible(true).setFillStyle(color, 0.75);
      return;
    }
  }

  update(dt: number) {
    for (let i = 0; i < this.dots.length; i += 1) {
      const dot = this.dots[i];
      if (dot.life <= 0) continue;
      dot.life -= dt;
      if (dot.life <= 0) {
        dot.life = 0;
        dot.dot.setVisible(false);
      } else {
        dot.dot.setAlpha(dot.life / dot.ttl);
      }
    }
  }

  setDepth(depth: number) {
    for (const dot of this.dots) {
      dot.dot.setDepth(depth);
    }
  }
}
