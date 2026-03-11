import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MatchScene } from './scenes/MatchScene';
import { MenuScene } from './scenes/MenuScene';
import { OnlineMenuScene } from './scenes/OnlineMenuScene';
import { ResultsScene } from './scenes/ResultsScene';

export const createGame = (parent: string): Phaser.Game => {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    width: 1280,
    height: 720,
    backgroundColor: '#091912',
    scene: [BootScene, MenuScene, OnlineMenuScene, MatchScene, ResultsScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: {
      antialias: true,
      pixelArt: false
    }
  };

  return new Phaser.Game(config);
};
