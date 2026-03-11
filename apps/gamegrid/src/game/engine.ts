import Phaser from 'phaser';
import { setMuted } from '../systems/audioManager';

export interface GameEngine {
  init: () => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  mute: (value: boolean) => void;
  destroy: () => void;
}

export function createPortalGame(target: HTMLDivElement, sceneLabel: string): GameEngine {
  const sceneKey = `portal-stub-${sceneLabel}`;
  let game: Phaser.Game | null = null;

  const init = () => {
    if (game) return;
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.CANVAS,
      width: 1280,
      height: 720,
      parent: target,
      transparent: false,
      backgroundColor: '#0a0f1c',
      scene: {
        key: sceneKey,
        create() {
          this.add
            .text(640, 360, `${sceneLabel}\nComing soon`, {
              fontFamily: 'Verdana',
              fontSize: '40px',
              color: '#ffffff',
              align: 'center'
            })
            .setOrigin(0.5);
        }
      }
    };

    game = new Phaser.Game(config);
  };

  return {
    init,
    start: () => game?.scene.resume(sceneKey),
    pause: () => game?.scene.pause(sceneKey),
    resume: () => game?.scene.resume(sceneKey),
    reset: () => {
      if (!game) {
        init();
        return;
      }
      game.scene.stop(sceneKey);
      game.scene.start(sceneKey);
    },
    mute: (value: boolean) => {
      if (!game) return;
      game.sound.mute = value;
      setMuted(value);
    },
    destroy: () => {
      if (!game) return;
      game.destroy(true);
      game = null;
    }
  };
}
