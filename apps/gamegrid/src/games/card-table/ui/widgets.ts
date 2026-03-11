import Phaser from 'phaser';
import { triggerHaptic } from '../../../systems/gameplayComfort';

export function createTextButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  options?: { width?: number; height?: number; fill?: number }
): Phaser.GameObjects.Container {
  const width = options?.width ?? 280;
  const height = options?.height ?? 52;
  const fill = options?.fill ?? 0x1f2d3d;

  const bg = scene.add
    .rectangle(0, 0, width, height, fill)
    .setStrokeStyle(2, 0xffffff, 0.2)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  const text = scene.add
    .text(0, 0, label, {
      fontFamily: 'Verdana',
      fontSize: '20px',
      color: '#ffffff'
    })
    .setOrigin(0.5);

  const container = scene.add.container(x, y, [bg, text]);
  bg.on('pointerdown', () => {
    triggerHaptic(8);
    onClick();
  });
  bg.on('pointerover', () => bg.setFillStyle(0x2b3f54));
  bg.on('pointerout', () => bg.setFillStyle(fill));
  return container;
}

export function createModal(
  scene: Phaser.Scene,
  title: string,
  body: string,
  onClose: () => void
): Phaser.GameObjects.Container {
  const overlay = scene.add.rectangle(640, 360, 1280, 720, 0x000000, 0.65).setInteractive();
  const panel = scene.add.rectangle(640, 360, 980, 560, 0x0f1a2b).setStrokeStyle(2, 0xffffff, 0.25);
  const titleText = scene.add
    .text(640, 130, title, { fontFamily: 'Verdana', fontSize: '30px', color: '#ffffff' })
    .setOrigin(0.5);
  const bodyText = scene.add
    .text(160, 190, body, {
      fontFamily: 'Verdana',
      fontSize: '20px',
      color: '#dbe7ff',
      wordWrap: { width: 960 }
    })
    .setOrigin(0, 0);
  const close = createTextButton(scene, 640, 610, 'Close', onClose, { width: 220, height: 48, fill: 0x2f5e95 });
  return scene.add.container(0, 0, [overlay, panel, titleText, bodyText, close]);
}
