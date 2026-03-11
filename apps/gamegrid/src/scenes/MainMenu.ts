import Phaser from 'phaser';
import { SCENE_KEYS } from '../util/starlightConstants';
import { getHooks, getSave, updateSave } from './starlightState';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.menu);
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#07172a');

    const starfield = this.add.tileSprite(width * 0.5, height * 0.5, width, height, '__WHITE');
    starfield.setTint(0x08111f);
    starfield.setAlpha(0.4);

    this.add
      .text(width * 0.5, 90, 'STARLIGHT\nCHRONICLES', {
        fontFamily: 'Verdana',
        fontSize: '56px',
        color: '#d9f4ff',
        align: 'center'
      })
      .setOrigin(0.5);

    const save = getSave();
    this.add.text(width * 0.5, 192, `Credits ${save.credits}   Materials ${save.materials}`, {
      fontFamily: 'Verdana',
      fontSize: '24px',
      color: '#9ec5e8'
    }).setOrigin(0.5);

    this.makeButton(width * 0.5, height * 0.48, 'Start Campaign', () => this.scene.start(SCENE_KEYS.missionSelect));
    this.makeButton(width * 0.5, height * 0.62, 'Hangar', () => this.scene.start(SCENE_KEYS.hangar));
    this.makeButton(width * 0.5, height * 0.76, 'Back To Lobby', () => {
      getHooks()?.backToLobby();
    });

    this.makeButton(130, height - 84, `Mute: ${save.settings.mute ? 'On' : 'Off'}`, (buttonLabel) => {
      const next = { ...getSave(), settings: { ...getSave().settings, mute: !getSave().settings.mute } };
      updateSave(next);
      this.sound.mute = next.settings.mute;
      buttonLabel.setText(`Mute: ${next.settings.mute ? 'On' : 'Off'}`);
    }, 220);

    this.makeButton(width - 170, height - 84, `FX: ${save.settings.reducedEffects ? 'Reduced' : 'Full'}`, (buttonLabel) => {
      const next = { ...getSave(), settings: { ...getSave().settings, reducedEffects: !getSave().settings.reducedEffects } };
      updateSave(next);
      buttonLabel.setText(`FX: ${next.settings.reducedEffects ? 'Reduced' : 'Full'}`);
    }, 280);
  }

  private makeButton(x: number, y: number, label: string, onClick: (label: Phaser.GameObjects.Text) => void, width = 340): void {
    const button = this.add.rectangle(x, y, width, 72, 0x1d456f, 0.9).setStrokeStyle(2, 0x8fceff).setInteractive();
    const text = this.add.text(x, y, label, { fontFamily: 'Verdana', fontSize: '26px', color: '#effbff' }).setOrigin(0.5);
    button.on('pointerdown', () => onClick(text));
    button.on('pointerover', () => button.setFillStyle(0x2a598b, 1));
    button.on('pointerout', () => button.setFillStyle(0x1d456f, 0.9));
    text.setDepth(button.depth + 1);
  }
}
