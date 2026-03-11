import Phaser from 'phaser';
import { SCENE_KEYS } from '../util/starlightConstants';

function generateTexture(scene: Phaser.Scene, key: string, color: number, w: number, h: number, shape: 'rect' | 'tri' | 'circle' = 'rect'): void {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  if (shape === 'rect') g.fillRect(0, 0, w, h);
  if (shape === 'tri') g.fillTriangle(w / 2, 0, 0, h, w, h);
  if (shape === 'circle') g.fillCircle(w / 2, h / 2, Math.min(w, h) * 0.5);
  g.generateTexture(key, w, h);
  g.destroy();
}

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.preload);
  }

  preload(): void {
    const { width, height } = this.scale;
    const barBg = this.add.rectangle(width * 0.5, height * 0.5, width * 0.7, 18, 0x18324f, 0.8);
    const barFill = this.add.rectangle(width * 0.15, height * 0.5, 2, 12, 0x69d2ff, 1).setOrigin(0, 0.5);
    this.load.on('progress', (value: number) => {
      barFill.width = (barBg.width - 8) * value;
    });
  }

  create(): void {
    generateTexture(this, 'player', 0x63d2ff, 34, 34, 'tri');
    generateTexture(this, 'enemy', 0xff8390, 32, 32, 'rect');
    generateTexture(this, 'drone', 0xfff7ad, 18, 18, 'circle');
    generateTexture(this, 'bullet', 0xffffff, 8, 8, 'circle');
    generateTexture(this, 'pickup', 0xffea95, 20, 20, 'circle');
    this.scene.start(SCENE_KEYS.menu);
  }
}
