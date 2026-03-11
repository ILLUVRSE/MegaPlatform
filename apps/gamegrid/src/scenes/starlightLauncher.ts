import Phaser from 'phaser';
import type { GameEngine } from '../game/engine';
import type { GameRuntimeHooks } from '../game/modules';
import { BootScene } from './Boot';
import { HangarScene } from './Hangar';
import { MainMenuScene } from './MainMenu';
import { MissionSelectScene } from './MissionSelect';
import { PerkPickScene } from './PerkPick';
import { PreloadScene } from './Preload';
import { ResultsScene } from './Results';
import { SortieScene } from './Sortie';
import { initRuntime } from './starlightState';
import { SCENE_KEYS } from '../util/starlightConstants';

export function createStarlightVerticalSliceGame(target: HTMLDivElement, hooks: GameRuntimeHooks): GameEngine {
  initRuntime(hooks);
  let game: Phaser.Game | null = null;

  const init = () => {
    if (game) return;
    game = new Phaser.Game({
      type: Phaser.CANVAS,
      width: 720,
      height: 1280,
      parent: target,
      backgroundColor: '#050d18',
      scene: [
        new BootScene(),
        new PreloadScene(),
        new MainMenuScene(),
        new HangarScene(),
        new MissionSelectScene(),
        new PerkPickScene(),
        new SortieScene(),
        new ResultsScene()
      ],
      input: { activePointers: 4 },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false
        }
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 720,
        height: 1280
      },
      fps: {
        target: 60,
        min: 30,
        forceSetTimeOut: false
      },
      render: {
        roundPixels: true,
        antialias: true
      }
    });
  };

  return {
    init,
    start: () => game?.scene.start(SCENE_KEYS.menu),
    pause: () => game?.scene.pause(SCENE_KEYS.sortie),
    resume: () => game?.scene.resume(SCENE_KEYS.sortie),
    reset: () => game?.scene.start(SCENE_KEYS.menu),
    mute: (value: boolean) => {
      if (!game) return;
      game.sound.mute = value;
    },
    destroy: () => {
      if (!game) return;
      game.destroy(true);
      game = null;
    }
  };
}
