import Phaser from 'phaser';
import { triggerHaptic } from '../../../../systems/gameplayComfort';
import type { OzChronicleAudio } from '../../audio';
import type { OzVisualTheme } from '../../visual/theme';

let activeTheme: OzVisualTheme | null = null;

function playUiCue(scene: Phaser.Scene): void {
  const audio = scene.registry.get('oz-chronicle-audio') as OzChronicleAudio | undefined;
  audio?.play('ui');
}

export function setUiTheme(theme: OzVisualTheme): void {
  activeTheme = theme;
}

export function clearContainer(container: Phaser.GameObjects.Container): void {
  container.removeAll(true);
}

export function makePanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  color = 0xf9f4df,
  alpha = 0.95
): Phaser.GameObjects.Rectangle {
  const fill = activeTheme?.colors.paper ?? color;
  const stroke = activeTheme?.colors.ink ?? 0x27231e;
  const panel = scene.add.rectangle(x, y, width, height, fill, alpha);
  panel.setStrokeStyle(3, stroke, 0.9);
  return panel;
}

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  label: string,
  onTap: () => void,
  accent = 0x2f6457
): Phaser.GameObjects.Container {
  const resolvedAccent = activeTheme?.colors.accent ?? accent;
  const resolvedInk = activeTheme?.colors.ink ?? 0x11251f;
  const bg = scene.add.rectangle(0, 0, width, 58, resolvedAccent, 1).setStrokeStyle(2, resolvedInk, 0.9);
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: 'Trebuchet MS',
      fontSize: `${activeTheme?.typography.body ?? 24}px`,
      color: activeTheme?.id === 'night-ink' ? '#f6f2e7' : '#f4f7f4'
    })
    .setOrigin(0.5);

  const button = scene.add.container(x, y, [bg, text]);
  button.setSize(width, 58);
  button.setInteractive(
    new Phaser.Geom.Rectangle(-width / 2, -29, width, 58),
    Phaser.Geom.Rectangle.Contains
  );

  button.on('pointerdown', () => {
    triggerHaptic(8);
    playUiCue(scene);
    onTap();
  });
  button.on('pointerover', () => bg.setFillStyle(Phaser.Display.Color.ValueToColor(resolvedAccent).brighten(12).color, 1));
  button.on('pointerout', () => bg.setFillStyle(resolvedAccent, 1));
  return button;
}

export function makeStatChip(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  value: number,
  color = 0x304b45
): Phaser.GameObjects.Container {
  const resolved = activeTheme?.colors.shadow ?? color;
  const stroke = activeTheme?.colors.ink ?? 0x122520;
  const bg = scene.add.rectangle(0, 0, 150, 48, resolved, 1).setStrokeStyle(2, stroke, 0.8);
  const text = scene.add
    .text(0, 0, `${label}: ${value}`, {
      fontFamily: 'Georgia',
      fontSize: `${activeTheme?.typography.caption ?? 20}px`,
      color: activeTheme?.id === 'night-ink' ? '#f6f2e7' : '#eef7f2'
    })
    .setOrigin(0.5);
  return scene.add.container(x, y, [bg, text]);
}
