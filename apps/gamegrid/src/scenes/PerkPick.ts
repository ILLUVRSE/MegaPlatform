import Phaser from 'phaser';
import { SCENE_KEYS } from '../util/starlightConstants';
import { hapticTap } from '../systems/starlightHaptics';
import { chooseRunPerks, getPerkChoices, getSave, setActiveRunPerk } from './starlightState';

export class PerkPickScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.perkPick);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#07182c');
    const { width, height } = this.scale;

    const save = getSave();
    if (!save.activeRun) {
      this.scene.start(SCENE_KEYS.missionSelect);
      return;
    }

    const perks = getPerkChoices().length ? getPerkChoices() : chooseRunPerks();

    this.add.text(width * 0.5, 72, 'Pick A Run Perk', { fontFamily: 'Verdana', fontSize: '42px', color: '#e0f3ff' }).setOrigin(0.5);
    this.add.text(width * 0.5, 110, `Mission ${save.activeRun.missionId}`, { fontFamily: 'Verdana', fontSize: '20px', color: '#9ac4e8' }).setOrigin(0.5);

    perks.forEach((perk, index) => {
      const y = 250 + index * 180;
      const card = this.add.rectangle(width * 0.5, y, width * 0.86, 142, 0x17456b, 0.95).setStrokeStyle(2, 0x91d0ff).setInteractive();
      this.add.text(width * 0.5, y - 38, perk.name, { fontFamily: 'Verdana', fontSize: '30px', color: '#f3fbff' }).setOrigin(0.5);
      this.add.text(width * 0.5, y + 2, perk.description, { fontFamily: 'Verdana', fontSize: '20px', color: '#c3e5ff' }).setOrigin(0.5);
      card.on('pointerdown', () => {
        hapticTap('light');
        setActiveRunPerk(perk.id);
        this.scene.start(SCENE_KEYS.sortie);
      });
    });

    const back = this.add.rectangle(width * 0.5, height - 90, 280, 62, 0x2a5d85, 0.95).setStrokeStyle(2, 0x9ed8ff).setInteractive();
    this.add.text(width * 0.5, height - 90, 'Back', { fontFamily: 'Verdana', fontSize: '24px', color: '#eef9ff' }).setOrigin(0.5);
    back.on('pointerdown', () => this.scene.start(SCENE_KEYS.missionSelect));
  }
}
