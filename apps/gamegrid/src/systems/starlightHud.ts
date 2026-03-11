import Phaser from 'phaser';

interface MeterCfg {
  x: number;
  y: number;
  w: number;
  h: number;
  color: number;
  bg: number;
}

function createMeter(scene: Phaser.Scene, cfg: MeterCfg) {
  const bg = scene.add.rectangle(cfg.x, cfg.y, cfg.w, cfg.h, cfg.bg, 0.8).setOrigin(0, 0).setScrollFactor(0).setDepth(120);
  const fill = scene.add.rectangle(cfg.x + 2, cfg.y + 2, cfg.w - 4, cfg.h - 4, cfg.color, 1).setOrigin(0, 0).setScrollFactor(0).setDepth(121);
  return { bg, fill, maxWidth: cfg.w - 4 };
}

export class StarlightHud {
  private hull = createMeter(this.scene, { x: 16, y: 16, w: 290, h: 18, color: 0xff6f7d, bg: 0x1a2235 });
  private shield = createMeter(this.scene, { x: 16, y: 40, w: 290, h: 14, color: 0x89d8ff, bg: 0x1a2235 });
  private heat = createMeter(this.scene, { x: 16, y: 62, w: 290, h: 14, color: 0xffb45f, bg: 0x1a2235 });
  private boss = createMeter(this.scene, { x: 76, y: 96, w: 568, h: 16, color: 0xd88bff, bg: 0x2d1d3d });

  private label = this.scene.add.text(16, 82, '', { fontFamily: 'Verdana', fontSize: '16px', color: '#d7f0ff' }).setDepth(122).setScrollFactor(0);
  private cooldownLabel = this.scene.add.text(16, 104, '', { fontFamily: 'Verdana', fontSize: '14px', color: '#c4e3ff' }).setDepth(122).setScrollFactor(0);
  private pickupFeed = this.scene.add.text(16, 128, '', { fontFamily: 'Verdana', fontSize: '14px', color: '#ffe2a8' }).setDepth(122).setScrollFactor(0);
  private intro = this.scene.add.text(this.scene.scale.width * 0.5, this.scene.scale.height * 0.2, '', { fontFamily: 'Verdana', fontSize: '28px', color: '#ecf8ff', align: 'center' }).setOrigin(0.5).setDepth(150).setScrollFactor(0).setVisible(false);
  private overlayBg = this.scene.add.rectangle(this.scene.scale.width * 0.5, this.scene.scale.height * 0.5, this.scene.scale.width, this.scene.scale.height, 0x040b16, 0.72).setDepth(160).setVisible(false);
  private overlayText = this.scene.add.text(this.scene.scale.width * 0.5, this.scene.scale.height * 0.5, '', { fontFamily: 'Verdana', fontSize: '30px', color: '#eaf7ff', align: 'center' }).setOrigin(0.5).setDepth(161).setVisible(false);
  private devText = this.scene.add.text(16, this.scene.scale.height - 84, '', { fontFamily: 'monospace', fontSize: '12px', color: '#8ceda7' }).setDepth(170).setScrollFactor(0).setVisible(false);
  private pickupLines: string[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    this.boss.bg.setVisible(false);
    this.boss.fill.setVisible(false);
  }

  showIntro(text: string): void {
    this.intro.setText(text).setVisible(true).setAlpha(1);
    this.scene.tweens.add({ targets: this.intro, alpha: 0, duration: 900, delay: 1100, onComplete: () => this.intro.setVisible(false) });
  }

  showBossBar(show: boolean): void {
    this.boss.bg.setVisible(show);
    this.boss.fill.setVisible(show);
  }

  pushPickup(text: string): void {
    this.pickupLines.unshift(text);
    this.pickupLines = this.pickupLines.slice(0, 4);
    this.pickupFeed.setText(this.pickupLines);
  }

  updateMeters(input: {
    hull: number;
    maxHull: number;
    shield: number;
    maxShield: number;
    heat: number;
    heatCap: number;
    blinkCd: number;
    secondaryCd: number;
    score: number;
    overheat: boolean;
    bossHp?: number;
    bossMaxHp?: number;
    missionName: string;
  }): void {
    const hullT = Phaser.Math.Clamp(input.hull / Math.max(1, input.maxHull), 0, 1);
    const shieldT = Phaser.Math.Clamp(input.shield / Math.max(1, input.maxShield), 0, 1);
    const heatT = Phaser.Math.Clamp(input.heat / Math.max(1, input.heatCap), 0, 1);
    this.hull.fill.width = this.hull.maxWidth * hullT;
    this.shield.fill.width = this.shield.maxWidth * shieldT;
    this.heat.fill.width = this.heat.maxWidth * heatT;
    this.heat.fill.setFillStyle(input.overheat ? 0xff5f6f : 0xffb45f, 1);

    this.label.setText(`${input.missionName}  SCORE ${input.score} | H ${Math.round(input.hull)} S ${Math.round(input.shield)}`);
    this.cooldownLabel.setText(`Heat ${Math.round(input.heat)} | Blink ${input.blinkCd.toFixed(1)}s | Secondary ${input.secondaryCd.toFixed(1)}s`);

    if (typeof input.bossHp === 'number' && typeof input.bossMaxHp === 'number' && input.bossMaxHp > 0) {
      this.showBossBar(true);
      this.boss.fill.width = this.boss.maxWidth * Phaser.Math.Clamp(input.bossHp / input.bossMaxHp, 0, 1);
    }
  }

  setDevVisible(show: boolean): void {
    this.devText.setVisible(show);
  }

  updateDev(lines: string[]): void {
    if (!this.devText.visible) return;
    this.devText.setText(lines);
  }

  showOverlay(title: string, body: string): void {
    this.overlayBg.setVisible(true);
    this.overlayText.setVisible(true).setText(`${title}\n\n${body}`);
  }

  hideOverlay(): void {
    this.overlayBg.setVisible(false);
    this.overlayText.setVisible(false);
  }
}
