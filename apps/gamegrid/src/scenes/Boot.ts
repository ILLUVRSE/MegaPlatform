import Phaser from 'phaser';
import { SCENE_KEYS } from '../util/starlightConstants';
import { runtimeSelfCheck } from './starlightState';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  create(): void {
    runtimeSelfCheck();
    this.scene.start(SCENE_KEYS.preload);
  }
}
