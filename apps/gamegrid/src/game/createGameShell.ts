import Phaser from 'phaser';
import type { GameEngine } from './engine';
import { setMuted } from '../systems/audioManager';

interface CreateGameShellOptions {
  target: HTMLDivElement;
  scene: Phaser.Scene;
  sceneKey: string;
  backgroundColor: string;
  targetFps: number;
}

export function createGameShell({
  target,
  scene,
  sceneKey,
  backgroundColor,
  targetFps
}: CreateGameShellOptions): GameEngine {
  let game: Phaser.Game | null = null;
  const resolution = Math.min(2, Math.max(1, window.devicePixelRatio || 1));

  const init = () => {
    if (game) return;
    game = new Phaser.Game({
      type: Phaser.CANVAS,
      width: 1280,
      height: 720,
      parent: target,
      backgroundColor,
      scene,
      input: {
        activePointers: 3
      },
      fps: {
        target: targetFps,
        min: 30,
        smoothStep: true
      },
      resolution,
      render: {
        antialias: true,
        antialiasGL: true,
        pixelArt: false,
        roundPixels: true
      }
    });

    game.events.once('ready', () => {
      const events = scene.events ?? scene.sys?.events;
      if (!events) return;
      events.on('shutdown', () => {
        scene.input?.removeAllListeners();
        scene.time?.removeAllEvents();
        scene.tweens?.killAll();
      });
    });
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
