import Phaser from 'phaser';
import { triggerHaptic } from '../../../systems/gameplayComfort';

export function makePanel(scene: Phaser.Scene, x: number, y: number, width: number, height: number, color = 0x0d1f37) {
  return scene.add.rectangle(x, y, width, height, color, 0.94).setStrokeStyle(2, 0x5ea4ff, 0.75);
}

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onTap: () => void,
  width = 330,
  height = 64,
  bg = 0x2d6cdf
) {
  const container = scene.add.container(x, y);
  const hit = scene.add.rectangle(0, 0, width, height, bg, 1).setStrokeStyle(2, 0xcde4ff, 0.85);
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: 'Verdana',
      fontSize: '24px',
      color: '#f5fbff',
      align: 'center'
    })
    .setOrigin(0.5)
    .setWordWrapWidth(width - 20, true);

  container.add([hit, text]);
  hit.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
    triggerHaptic(8);
    onTap();
  });

  return {
    container,
    setLabel(nextLabel: string) {
      text.setText(nextLabel);
    },
    setVisible(visible: boolean) {
      container.setVisible(visible);
    },
    destroy() {
      container.destroy(true);
    }
  };
}
