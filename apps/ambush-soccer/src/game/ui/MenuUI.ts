import Phaser from 'phaser';

export class MenuUI {
  private options: Phaser.GameObjects.Text[] = [];
  private title: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, labels: string[]) {
    this.title = scene.add
      .text(scene.scale.width / 2, 90, 'AMBUSH SOCCER', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '56px',
        color: '#dffff0'
      })
      .setOrigin(0.5);

    this.options = labels.map((label, index) =>
      scene.add
        .text(scene.scale.width / 2, 220 + index * 64, label, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '34px',
          color: '#97d8bb'
        })
        .setOrigin(0.5)
    );

    scene.add
      .text(scene.scale.width / 2, scene.scale.height - 34, 'Arrows/W-S to select, Enter/Space to start', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#8cb8a7'
      })
      .setOrigin(0.5);
  }

  setSelected(index: number): void {
    this.options.forEach((opt, i) => {
      opt.setColor(i === index ? '#fff6a3' : '#97d8bb');
      opt.setScale(i === index ? 1.08 : 1);
    });
  }

  destroy(): void {
    this.title.destroy();
    this.options.forEach((o) => o.destroy());
  }
}
