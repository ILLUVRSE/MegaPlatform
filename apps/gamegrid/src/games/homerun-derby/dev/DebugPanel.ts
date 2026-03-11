import Phaser from 'phaser';
import type { PitchType } from '../types';

export interface DebugOverrides {
  forcedType: PitchType | null;
  speedBucket: 'slow' | 'medium' | 'fast' | null;
  deterministic: boolean;
}

export class DebugPanel {
  private readonly scene: Phaser.Scene;
  private readonly text: Phaser.GameObjects.Text;
  private overrides: DebugOverrides;
  private readonly onChange: (next: DebugOverrides) => void;

  constructor(scene: Phaser.Scene, onChange: (next: DebugOverrides) => void) {
    this.scene = scene;
    this.onChange = onChange;
    this.overrides = { forcedType: null, speedBucket: null, deterministic: false };
    this.text = scene.add.text(20, 160, '', { color: '#ffd68a', fontSize: '12px', fontFamily: 'monospace' }).setDepth(30);
    this.text.setVisible(import.meta.env.DEV);
    this.refresh();

    if (import.meta.env.DEV) {
      this.scene.input.keyboard?.on('keydown-ONE', () => this.setType('fastball'));
      this.scene.input.keyboard?.on('keydown-TWO', () => this.setType('curveball'));
      this.scene.input.keyboard?.on('keydown-THREE', () => this.setType('slider'));
      this.scene.input.keyboard?.on('keydown-FOUR', () => this.setType('changeup'));
      this.scene.input.keyboard?.on('keydown-FIVE', () => this.setType('splitter'));
      this.scene.input.keyboard?.on('keydown-ZERO', () => this.setType(null));
      this.scene.input.keyboard?.on('keydown-S', () => this.cycleSpeed());
      this.scene.input.keyboard?.on('keydown-D', () => this.toggleDeterministic());
    }
  }

  getOverrides() {
    return this.overrides;
  }

  private setType(type: PitchType | null) {
    this.overrides = { ...this.overrides, forcedType: type };
    this.flush();
  }

  private cycleSpeed() {
    const next = this.overrides.speedBucket === null ? 'slow' : this.overrides.speedBucket === 'slow' ? 'medium' : this.overrides.speedBucket === 'medium' ? 'fast' : null;
    this.overrides = { ...this.overrides, speedBucket: next };
    this.flush();
  }

  private toggleDeterministic() {
    this.overrides = { ...this.overrides, deterministic: !this.overrides.deterministic };
    this.flush();
  }

  private flush() {
    this.refresh();
    this.onChange(this.overrides);
  }

  private refresh() {
    if (!import.meta.env.DEV) return;
    const type = this.overrides.forcedType ?? 'auto';
    const speed = this.overrides.speedBucket ?? 'auto';
    const det = this.overrides.deterministic ? 'on' : 'off';
    this.text.setText(
      `Debug: Type ${type} | Speed ${speed} | Seed ${det}\n[1] Fastball [2] Curve [3] Slider [4] Changeup [5] Splitter [0] Auto | [S] Speed | [D] Seed`
    );
  }
}
