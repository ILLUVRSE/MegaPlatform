import Phaser from 'phaser';

const UI_FONT = "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif";

export interface HudInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface HudData {
  score: number;
  countLabel: string;
  comboLabel: string;
  badgeLabel: string;
  pitchLabel: string;
  streak: number;
  hintText?: string;
  toast?: { text: string; tone: 'good' | 'bad' | 'neutral' } | null;
}

export class HomerunHud {
  private readonly scene: Phaser.Scene;
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly countText: Phaser.GameObjects.Text;
  private readonly comboText: Phaser.GameObjects.Text;
  private readonly badgeText: Phaser.GameObjects.Text;
  private readonly pitchText: Phaser.GameObjects.Text;
  private readonly hintText: Phaser.GameObjects.Text;
  private readonly toastBg: Phaser.GameObjects.Rectangle;
  private readonly toastText: Phaser.GameObjects.Text;
  private readonly pauseButtonBg: Phaser.GameObjects.Rectangle;
  private readonly pauseButtonText: Phaser.GameObjects.Text;
  private leftHanded = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.scoreText = scene.add.text(0, 0, 'Score 0', { color: '#f7fbff', fontSize: '24px', fontFamily: UI_FONT }).setOrigin(0, 0.5);
    this.countText = scene.add.text(0, 0, '00:00', { color: '#ffffff', fontSize: '22px', fontFamily: UI_FONT }).setOrigin(0.5, 0.5);
    this.comboText = scene.add.text(0, 0, 'x1', { color: '#ffd58a', fontSize: '15px', fontFamily: UI_FONT }).setOrigin(0.5, 0.5);

    this.badgeText = scene.add.text(0, 0, '', { color: '#d8ebff', fontSize: '13px', fontFamily: UI_FONT }).setOrigin(0, 0.5);
    this.pitchText = scene.add.text(0, 0, '', { color: '#f3d6a2', fontSize: '13px', fontFamily: UI_FONT }).setOrigin(0, 0.5);

    this.hintText = scene.add
      .text(0, 0, 'Swipe to swing', {
        color: '#ffffff',
        fontSize: '18px',
        fontFamily: UI_FONT,
        backgroundColor: '#152b40',
        padding: { left: 12, right: 12, top: 8, bottom: 8 }
      })
      .setOrigin(0.5)
      .setAlpha(0.95);

    this.toastBg = scene.add.rectangle(0, 0, 260, 38, 0x162b40, 0.92).setOrigin(0.5);
    this.toastText = scene.add.text(0, 0, '', { color: '#ffffff', fontSize: '15px', fontFamily: UI_FONT }).setOrigin(0.5);
    this.toastBg.setVisible(false);
    this.toastText.setVisible(false);

    this.pauseButtonBg = scene.add.rectangle(0, 0, 50, 50, 0x1e3853, 0.95).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.pauseButtonText = scene.add.text(0, 0, 'II', { color: '#f8fbff', fontSize: '20px', fontFamily: UI_FONT }).setOrigin(0.5);
  }

  onMenuClick(handler: () => void) {
    this.pauseButtonBg.removeAllListeners();
    this.pauseButtonBg.on('pointerdown', handler);
  }

  setLeftHanded(value: boolean) {
    this.leftHanded = value;
  }

  layout(width: number, height: number, inset: HudInsets) {
    const safeTop = inset.top + 18;
    const safeRight = width - inset.right - 18;
    const safeLeft = inset.left + 18;
    const centerX = width / 2;

    this.scoreText.setPosition(safeLeft, safeTop + 10);
    this.countText.setPosition(centerX, safeTop + 10);
    this.comboText.setPosition(centerX, safeTop + 36);

    this.pauseButtonBg.setPosition(safeRight - 8, safeTop + 10);
    this.pauseButtonText.setPosition(safeRight - 8, safeTop + 10);

    const infoX = this.leftHanded ? safeRight - 210 : safeLeft;
    this.badgeText.setPosition(infoX, safeTop + 62);
    this.pitchText.setPosition(infoX, safeTop + 82);

    this.hintText.setPosition(centerX, height - inset.bottom - 42);
    this.toastBg.setPosition(centerX, safeTop + 124);
    this.toastText.setPosition(centerX, safeTop + 124);
  }

  update(data: HudData) {
    this.scoreText.setText(`Score ${data.score}`);
    this.countText.setText(data.countLabel);
    this.comboText.setText(data.comboLabel);
    this.badgeText.setText(data.badgeLabel);
    this.pitchText.setText(data.pitchLabel);

    const hint = data.hintText ?? '';
    if (!hint) {
      this.hintText.setVisible(false);
    } else {
      this.hintText.setVisible(true);
      this.hintText.setText(hint);
    }
  }

  showToast(text: string, tone: 'good' | 'bad' | 'neutral' = 'neutral') {
    if (!text) {
      this.toastBg.setVisible(false);
      this.toastText.setVisible(false);
      return;
    }
    const color = tone === 'good' ? 0x1f3d2d : tone === 'bad' ? 0x3a1e23 : 0x162b40;
    this.toastBg.setFillStyle(color, 0.92);
    this.toastText.setText(text);
    this.toastBg.setVisible(true).setAlpha(1);
    this.toastText.setVisible(true).setAlpha(1);
    this.scene.tweens.add({
      targets: [this.toastBg, this.toastText],
      alpha: 0,
      duration: 900,
      delay: 850,
      onComplete: () => {
        this.toastBg.setVisible(false);
        this.toastText.setVisible(false);
      }
    });
  }
}
