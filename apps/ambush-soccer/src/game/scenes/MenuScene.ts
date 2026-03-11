import Phaser from 'phaser';
import type { Mode } from '../../shared/types';
import { MenuUI } from '../ui/MenuUI';

const OPTIONS: { label: string; mode: Mode }[] = [
  { label: 'Quick Match vs AI', mode: 'quick' },
  { label: 'Local Versus (2P)', mode: 'local-versus' },
  { label: 'Practice', mode: 'practice' },
  { label: 'Online', mode: 'online' }
];

export class MenuScene extends Phaser.Scene {
  private selected = 0;
  private ui!: MenuUI;

  constructor() {
    super('menu');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0c211a');
    this.ui = new MenuUI(this, OPTIONS.map((o) => o.label));
    this.ui.setSelected(this.selected);

    this.input.keyboard?.on('keydown-UP', () => this.moveSelection(-1));
    this.input.keyboard?.on('keydown-W', () => this.moveSelection(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.moveSelection(1));
    this.input.keyboard?.on('keydown-S', () => this.moveSelection(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.startMatch());
    this.input.keyboard?.on('keydown-SPACE', () => this.startMatch());
  }

  private moveSelection(delta: number): void {
    this.selected = (this.selected + delta + OPTIONS.length) % OPTIONS.length;
    this.ui.setSelected(this.selected);
  }

  private startMatch(): void {
    const selected = OPTIONS[this.selected];
    if (selected.mode === 'online') {
      this.scene.start('online-menu');
      return;
    }
    this.scene.start('match', { mode: selected.mode });
  }
}
