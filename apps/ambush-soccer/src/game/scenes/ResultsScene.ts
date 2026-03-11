import Phaser from 'phaser';
import type { MatchState } from '../../shared/types';
import { ResultsUI } from '../ui/ResultsUI';

export class ResultsScene extends Phaser.Scene {
  constructor() {
    super('results');
  }

  create(data: { match: MatchState }): void {
    this.cameras.main.setBackgroundColor('#10231c');
    new ResultsUI(this, data.match);
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('menu'));
    this.input.keyboard?.once('keydown-SPACE', () => this.scene.start('menu'));
  }
}
