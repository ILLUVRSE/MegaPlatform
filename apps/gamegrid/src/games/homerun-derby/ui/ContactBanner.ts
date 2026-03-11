import Phaser from 'phaser';

const UI_FONT = "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif";

export class ContactBanner {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly subtitle: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.bg = scene.add.rectangle(0, 0, 280, 56, 0x162b40, 0.92).setOrigin(0.5);
    this.title = scene.add.text(0, -10, '', { fontFamily: UI_FONT, fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);
    this.subtitle = scene.add.text(0, 12, '', { fontFamily: UI_FONT, fontSize: '13px', color: '#cfe3ff' }).setOrigin(0.5);
    this.container = scene.add.container(0, 0, [this.bg, this.title, this.subtitle]).setVisible(false).setAlpha(0);
  }

  setDepth(depth: number) {
    this.container.setDepth(depth);
  }

  layout(width: number, top: number) {
    this.container.setPosition(width / 2, top + 150);
  }

  show(title: string, subtitle: string, tone: 'good' | 'bad' | 'neutral' = 'neutral') {
    const color = tone === 'good' ? 0x1f3d2d : tone === 'bad' ? 0x3a1e23 : 0x162b40;
    this.bg.setFillStyle(color, 0.92);
    this.title.setText(title);
    this.subtitle.setText(subtitle);
    this.container.setVisible(true).setAlpha(0);

    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 120,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.container,
          alpha: 0,
          duration: 240,
          delay: 520,
          ease: 'Sine.easeIn',
          onComplete: () => this.container.setVisible(false)
        });
      }
    });
  }
}
