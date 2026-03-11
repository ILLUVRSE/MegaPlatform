import Phaser from 'phaser';

const UI_FONT = 'Trebuchet MS, Verdana, sans-serif';

export interface HudLayoutInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface HudData {
  score: number;
  timerLabel: string;
  comboLabel: string;
  modeLabel: string;
  spotLabel: string;
  accuracyLabel: string;
  pressure: number;
  heatLevel: number;
  ghostLabel: string;
  challengeLabel: string;
  paused: boolean;
}

export class FreethrowHud {
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly timerText: Phaser.GameObjects.Text;
  private readonly comboText: Phaser.GameObjects.Text;
  private readonly modeText: Phaser.GameObjects.Text;
  private readonly spotText: Phaser.GameObjects.Text;
  private readonly accuracyText: Phaser.GameObjects.Text;
  private readonly pressureBar: Phaser.GameObjects.Graphics;
  private readonly heatDots: Phaser.GameObjects.Graphics;
  private readonly ghostText: Phaser.GameObjects.Text;
  private readonly challengeText: Phaser.GameObjects.Text;
  private readonly toastText: Phaser.GameObjects.Text;
  private readonly toastBg: Phaser.GameObjects.Rectangle;
  private readonly pauseButton: Phaser.GameObjects.Text;
  private readonly modeBadge: Phaser.GameObjects.Rectangle;
  private readonly comboPill: Phaser.GameObjects.Rectangle;
  private readonly goalCard: Phaser.GameObjects.Rectangle;
  private leftHanded = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.scoreText = scene.add.text(0, 0, '0', { color: '#f7fbff', fontSize: '36px', fontFamily: UI_FONT }).setOrigin(0.5, 0);
    this.timerText = scene.add.text(0, 0, '00:00', { color: '#9fd5ff', fontSize: '22px', fontFamily: UI_FONT }).setOrigin(0.5, 0);

    this.comboPill = scene.add.rectangle(0, 0, 120, 28, 0x1d3b57, 0.9).setOrigin(0.5, 0);
    this.comboText = scene.add.text(0, 0, 'Streak x1', { color: '#ffd58a', fontSize: '16px', fontFamily: UI_FONT }).setOrigin(0.5, 0.5);

    this.modeBadge = scene
      .add.rectangle(0, 0, 180, 34, 0x16324d, 0.9)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    this.modeText = scene.add.text(0, 0, 'Timed 60s', { color: '#d8ebff', fontSize: '14px', fontFamily: UI_FONT }).setOrigin(0, 0.5);
    this.spotText = scene.add.text(0, 0, 'Free Throw', { color: '#9fe8d4', fontSize: '13px', fontFamily: UI_FONT }).setOrigin(0, 0.5);

    this.accuracyText = scene.add.text(0, 0, 'Accuracy 0%', { color: '#a8c8ff', fontSize: '14px', fontFamily: UI_FONT }).setOrigin(0, 0.5);

    this.pressureBar = scene.add.graphics();
    this.heatDots = scene.add.graphics();

    this.goalCard = scene.add.rectangle(0, 0, 240, 64, 0x0f2236, 0.92).setOrigin(0, 0);
    this.ghostText = scene.add.text(0, 0, 'Ghost 0', { color: '#ffe8a3', fontSize: '14px', fontFamily: UI_FONT }).setOrigin(0, 0);
    this.challengeText = scene.add.text(0, 0, 'Challenge', { color: '#9cd3ff', fontSize: '12px', fontFamily: UI_FONT }).setOrigin(0, 0);

    this.toastBg = scene.add.rectangle(0, 0, 220, 36, 0x162b40, 0.92).setOrigin(0.5);
    this.toastText = scene.add.text(0, 0, '', { color: '#ffffff', fontSize: '15px', fontFamily: UI_FONT }).setOrigin(0.5);
    this.toastBg.setVisible(false);
    this.toastText.setVisible(false);

    this.pauseButton = scene.add
      .text(0, 0, 'Menu', { color: '#f8fbff', fontSize: '16px', backgroundColor: '#1e3853', fontFamily: UI_FONT })
      .setPadding(10, 6, 10, 6)
      .setInteractive({ useHandCursor: true });

    this.root = scene.add.container(0, 0, [
      this.scoreText,
      this.timerText,
      this.comboPill,
      this.comboText,
      this.modeBadge,
      this.modeText,
      this.spotText,
      this.accuracyText,
      this.pressureBar,
      this.heatDots,
      this.goalCard,
      this.ghostText,
      this.challengeText,
      this.toastBg,
      this.toastText,
      this.pauseButton
    ]);
  }

  onPauseClick(handler: () => void) {
    this.pauseButton.removeAllListeners();
    this.pauseButton.on('pointerdown', handler);
  }

  onModeBadgeClick(handler: () => void) {
    this.modeBadge.removeAllListeners();
    this.modeBadge.on('pointerdown', handler);
  }

  setLeftHanded(value: boolean) {
    this.leftHanded = value;
  }

  layout(width: number, height: number, inset: HudLayoutInsets) {
    const safeTop = inset.top + 10;
    const safeRight = width - inset.right - 16;
    const safeLeft = inset.left + 16;

    const centerX = width / 2;
    this.scoreText.setPosition(centerX, safeTop);
    this.timerText.setPosition(centerX, safeTop + 40);

    this.comboPill.setPosition(centerX, safeTop + 74);
    this.comboText.setPosition(centerX, safeTop + 88);

    const badgeX = this.leftHanded ? safeRight - 200 : safeLeft;
    this.modeBadge.setPosition(badgeX, safeTop + 6);
    this.modeText.setPosition(badgeX + 10, safeTop + 14);
    this.spotText.setPosition(badgeX + 10, safeTop + 32);

    const accuracyX = this.leftHanded ? safeRight - 200 : safeLeft;
    this.accuracyText.setPosition(accuracyX + 10, safeTop + 60);

    const pressureX = this.leftHanded ? safeRight - 200 : safeLeft;
    this.drawPressure(pressureX + 10, safeTop + 78, 170, 8, 0, 0);

    const goalX = this.leftHanded ? safeRight - 260 : safeLeft;
    const goalY = height - inset.bottom - 110;
    this.goalCard.setPosition(goalX, goalY);
    this.ghostText.setPosition(goalX + 10, goalY + 10);
    this.challengeText.setPosition(goalX + 10, goalY + 32);

    this.pauseButton.setPosition(this.leftHanded ? safeLeft : safeRight, safeTop + 6).setOrigin(this.leftHanded ? 0 : 1, 0);

    this.toastBg.setPosition(centerX, safeTop + 120);
    this.toastText.setPosition(centerX, safeTop + 120);
  }

  update(data: HudData) {
    this.scoreText.setText(String(data.score));
    this.timerText.setText(data.timerLabel);
    this.comboText.setText(data.comboLabel);
    this.modeText.setText(data.modeLabel);
    this.spotText.setText(data.spotLabel);
    this.accuracyText.setText(data.accuracyLabel);
    this.ghostText.setText(data.ghostLabel);
    this.challengeText.setText(data.challengeLabel);

    const barX = this.modeBadge.x + 10;
    const barY = this.modeBadge.y + 72;
    this.drawPressure(barX, barY, 170, 8, data.pressure, data.heatLevel);
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

  private drawPressure(x: number, y: number, width: number, height: number, pressure: number, heat: number) {
    this.pressureBar.clear();
    this.pressureBar.fillStyle(0x112338, 0.9);
    this.pressureBar.fillRoundedRect(x, y, width, height, 3);
    this.pressureBar.fillStyle(0xff8c8c, 0.85);
    this.pressureBar.fillRoundedRect(x, y, Math.max(0, width * pressure), height, 3);

    this.heatDots.clear();
    const dotSize = 5;
    const dotGap = 4;
    const startX = x;
    const dotY = y + 14;
    for (let i = 0; i < 8; i += 1) {
      const active = i < heat;
      this.heatDots.fillStyle(active ? 0xffc867 : 0x33465f, active ? 0.9 : 0.5);
      this.heatDots.fillRoundedRect(startX + i * (dotSize + dotGap), dotY, dotSize, 4, 2);
    }
  }

  setVisible(visible: boolean) {
    this.root.setVisible(visible);
  }
}
