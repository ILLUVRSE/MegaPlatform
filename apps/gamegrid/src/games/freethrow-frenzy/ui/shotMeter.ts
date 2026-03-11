import Phaser from 'phaser';

const UI_FONT = 'Trebuchet MS, Verdana, sans-serif';

export interface MeterLayoutInsets {
  left: number;
  right: number;
  bottom: number;
}

export class ShotMeter {
  private readonly scene: Phaser.Scene;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly aimIndicator: Phaser.GameObjects.Rectangle;
  private readonly chargeFill: Phaser.GameObjects.Rectangle;
  private readonly chargeBg: Phaser.GameObjects.Rectangle;
  private leftHanded = false;
  private x = 0;
  private y = 0;
  private width = 360;
  private height = 14;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.gfx = scene.add.graphics();
    this.label = scene.add.text(0, 0, 'Release on green', { color: '#d9f0ff', fontSize: '13px', fontFamily: UI_FONT }).setOrigin(0.5, 1);
    this.aimIndicator = scene.add.rectangle(0, 0, 6, 18, 0x89c4ff, 0.9).setOrigin(0.5, 0.5);
    this.chargeBg = scene.add.rectangle(0, 0, 120, 6, 0x1b2f45, 0.9).setOrigin(0.5, 0.5);
    this.chargeFill = scene.add.rectangle(0, 0, 0, 6, 0x7ddf94, 0.95).setOrigin(0, 0.5);
  }

  setLeftHanded(value: boolean) {
    this.leftHanded = value;
  }

  layout(width: number, height: number, inset: MeterLayoutInsets) {
    this.width = Math.min(420, width - inset.left - inset.right - 40);
    this.height = 14;
    this.x = width / 2 + (this.leftHanded ? -80 : 80);
    this.y = height - inset.bottom - 34;
    this.label.setPosition(this.x, this.y - 8);
    this.chargeBg.setPosition(this.x, this.y + 18);
    this.chargeFill.setPosition(this.x - this.chargeBg.width / 2, this.y + 18);
  }

  update(phase: number, window: { green: number; yellow: number }, aim: number, charge: number, active: boolean, colorblind = false) {
    if (!active) {
      this.gfx.clear();
      this.aimIndicator.setVisible(false);
      this.chargeBg.setVisible(false);
      this.chargeFill.setVisible(false);
      return;
    }
    const meterX = this.x - this.width / 2;
    const meterY = this.y;
    const greenWidth = this.width * window.green;
    const yellowWidth = this.width * window.yellow;
    const greenStart = meterX + this.width * 0.5 - greenWidth / 2;
    const yellowStart = meterX + this.width * 0.5 - yellowWidth / 2;

    this.gfx.clear();
    this.gfx.fillStyle(0x14273b, 0.95);
    this.gfx.fillRoundedRect(meterX, meterY, this.width, this.height, 6);

    this.gfx.fillStyle(colorblind ? 0x5fa8d3 : 0xd37b52, 0.6);
    this.gfx.fillRoundedRect(yellowStart, meterY, yellowWidth, this.height, 6);
    this.gfx.fillStyle(colorblind ? 0x9cdbff : 0x63d389, 0.9);
    this.gfx.fillRoundedRect(greenStart, meterY, greenWidth, this.height, 6);

    const indicatorX = meterX + phase * this.width;
    this.gfx.fillStyle(0xf4f7ff, 1);
    this.gfx.fillRoundedRect(indicatorX - 3, meterY - 3, 6, this.height + 6, 3);

    this.aimIndicator.setVisible(true);
    this.aimIndicator.setPosition(meterX + this.width * 0.5 + aim * (this.width * 0.32), meterY - 10);

    this.chargeBg.setVisible(true);
    this.chargeFill.setVisible(true);
    this.chargeFill.width = Math.max(1, this.chargeBg.width * charge);
  }

  setVisible(visible: boolean) {
    this.gfx.setVisible(visible);
    this.label.setVisible(visible);
  }
}
