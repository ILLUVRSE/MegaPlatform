import Phaser from 'phaser';

interface Popup {
  text: Phaser.GameObjects.Text;
  life: number;
  ttl: number;
  vx: number;
  vy: number;
  active: boolean;
}

const UI_FONT = "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif";

export class ResultPopupPool {
  private readonly popups: Popup[];
  private cursor = 0;

  constructor(scene: Phaser.Scene, size: number) {
    this.popups = Array.from({ length: size }, () => ({
      text: scene.add.text(0, 0, '', { fontFamily: UI_FONT, fontSize: '22px', color: '#ffffff', stroke: '#101820', strokeThickness: 4 }).setOrigin(0.5).setVisible(false),
      life: 0,
      ttl: 0,
      vx: 0,
      vy: 0,
      active: false
    }));
  }

  spawn(x: number, y: number, label: string, color = '#ffffff', life = 0.55) {
    const popup = this.popups[this.cursor];
    this.cursor = (this.cursor + 1) % this.popups.length;
    popup.text.setPosition(x, y).setText(label).setColor(color).setVisible(true).setAlpha(1);
    popup.life = life;
    popup.ttl = life;
    popup.vx = 0;
    popup.vy = -64;
    popup.active = true;
  }

  update(dt: number) {
    for (let i = 0; i < this.popups.length; i += 1) {
      const popup = this.popups[i];
      if (!popup.active) continue;
      popup.life -= dt;
      if (popup.life <= 0) {
        popup.active = false;
        popup.text.setVisible(false);
        continue;
      }
      popup.text.x += popup.vx * dt;
      popup.text.y += popup.vy * dt;
      popup.text.setAlpha(Math.max(0, popup.life / popup.ttl));
    }
  }

  setDepth(depth: number) {
    for (let i = 0; i < this.popups.length; i += 1) {
      this.popups[i].text.setDepth(depth);
    }
  }
}
