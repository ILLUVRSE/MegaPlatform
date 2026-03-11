import Phaser from 'phaser';

export interface TimingMeterInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export class TimingMeter {
  private readonly scene: Phaser.Scene;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private width = 220;
  private height = 18;
  private x = 0;
  private y = 0;
  private visible = true;
  private lastDeltaText?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.gfx = scene.add.graphics();
    this.lastDeltaText = scene.add.text(0, 0, '', { fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif", fontSize: '12px', color: '#dfe9ff' }).setOrigin(0.5, 0.5).setVisible(false);
  }

  setVisible(value: boolean) {
    this.visible = value;
    this.gfx.setVisible(value);
    if (!value) this.lastDeltaText?.setVisible(false);
  }

  layout(width: number, height: number, inset: TimingMeterInsets) {
    this.width = Math.min(280, width - inset.left - inset.right - 40);
    this.height = 16;
    this.x = width / 2 - this.width / 2;
    this.y = height - inset.bottom - 96;
    this.lastDeltaText?.setPosition(width / 2, this.y - 18);
  }

  update(progress: number, perfectWindow: number, earlyLateWindow: number) {
    if (!this.visible) return;
    const g = this.gfx;
    g.clear();

    const x = this.x;
    const y = this.y;

    g.fillStyle(0x0f2236, 0.9);
    g.fillRoundedRect(x, y, this.width, this.height, 6);

    const arrivalTick = 0.5;
    const perfectWidth = this.width * perfectWindow;
    const earlyLateWidth = this.width * earlyLateWindow;

    const perfectX = x + this.width * arrivalTick - perfectWidth / 2;
    const earlyX = x + this.width * arrivalTick - earlyLateWidth / 2;

    g.fillStyle(0x2a4b64, 0.9);
    g.fillRoundedRect(earlyX, y + 3, earlyLateWidth, this.height - 6, 6);

    g.fillStyle(0x5cc2a5, 0.95);
    g.fillRoundedRect(perfectX, y + 4, perfectWidth, this.height - 8, 6);

    const tickX = x + this.width * arrivalTick;
    g.fillStyle(0xffffff, 0.8);
    g.fillRect(tickX - 1, y - 4, 2, this.height + 8);

    const markerX = x + this.width * progress;
    g.fillStyle(0xffffff, 0.95);
    g.fillRoundedRect(markerX - 2, y - 4, 4, this.height + 8, 2);
  }

  showDelta(label: string) {
    if (!this.lastDeltaText) return;
    if (!label) {
      this.lastDeltaText.setVisible(false);
      return;
    }
    this.lastDeltaText.setText(label).setVisible(true).setAlpha(1);
    this.scene.tweens.add({
      targets: this.lastDeltaText,
      alpha: 0,
      duration: 600,
      delay: 500,
      onComplete: () => this.lastDeltaText?.setVisible(false)
    });
  }
}
