import Phaser from 'phaser';

const UI_FONT = "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif";

export class PitchCountdown {
  private readonly scene: Phaser.Scene;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly bar: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private readonly container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.bg = scene.add.rectangle(0, 0, 140, 18, 0x162b40, 0.9).setOrigin(0, 0.5);
    this.bar = scene.add.rectangle(0, 0, 140, 18, 0x5cc2a5, 0.8).setOrigin(0, 0.5).setScale(0, 1);
    this.label = scene.add.text(0, -18, 'Next pitch', { fontFamily: UI_FONT, fontSize: '12px', color: '#d8ebff' }).setOrigin(0, 0.5);
    this.container = scene.add.container(0, 0, [this.bg, this.bar, this.label]).setVisible(false);
  }

  setDepth(depth: number) {
    this.container.setDepth(depth);
  }

  layout(x: number, y: number) {
    this.container.setPosition(x, y);
  }

  update(progress: number) {
    this.container.setVisible(true);
    this.bar.setScale(progress, 1);
  }

  hide() {
    this.container.setVisible(false);
  }
}
