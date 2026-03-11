import Phaser from 'phaser';
import { MISSIONS } from '../data/starlightMissions';
import { buildLaunchValidation, chooseRunPerks, getSave, setSelectedMissionId, startActiveRun } from './starlightState';
import { SCENE_KEYS } from '../util/starlightConstants';

export class MissionSelectScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.missionSelect);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#081827');
    const { width } = this.scale;
    this.add.text(width * 0.5, 48, 'Sector 1 Missions', { fontFamily: 'Verdana', fontSize: '42px', color: '#d6f1ff' }).setOrigin(0.5);

    const save = getSave();
    this.add.text(width * 0.5, 94, `Credits ${save.credits} | Signature Tech ${save.unlocks.signatureTech.length}`, { fontFamily: 'Verdana', fontSize: '20px', color: '#9ec3e8' }).setOrigin(0.5);

    const launchValidation = buildLaunchValidation(save);
    if (!launchValidation.ok) {
      this.add.text(width * 0.5, 128, `Launch blocked: ${launchValidation.reason}`, { fontFamily: 'Verdana', fontSize: '18px', color: '#ffc486' }).setOrigin(0.5);
    }

    MISSIONS.forEach((mission, index) => {
      const y = 190 + index * 150;
      const locked = !launchValidation.ok;
      const card = this.add
        .rectangle(width * 0.5, y, width * 0.86, 122, locked ? 0x2d3540 : 0x14395a, 0.9)
        .setStrokeStyle(2, locked ? 0x6d7a8a : 0x8ecfff)
        .setInteractive();
      this.add.text(80, y - 44, mission.name, { fontFamily: 'Verdana', fontSize: '24px', color: '#f0f8ff' });
      this.add.text(80, y - 10, mission.description, { fontFamily: 'Verdana', fontSize: '18px', color: '#b6daff' });
      this.add.text(width - 230, y - 8, `Threat ${mission.difficulty}`, { fontFamily: 'Verdana', fontSize: '20px', color: '#ffcf87' });
      card.on('pointerdown', () => {
        if (!launchValidation.ok) return;
        setSelectedMissionId(mission.id);
        startActiveRun(mission.id);
        chooseRunPerks();
        this.scene.start(SCENE_KEYS.perkPick);
      });
    });

    this.makeButton(width - 150, this.scale.height - 90, 'Hangar', () => this.scene.start(SCENE_KEYS.hangar));
    this.makeButton(150, this.scale.height - 90, 'Menu', () => this.scene.start(SCENE_KEYS.menu));
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const button = this.add.rectangle(x, y, 180, 54, 0x26547c, 0.95).setStrokeStyle(2, 0x9dd7ff).setInteractive();
    const text = this.add.text(x, y, label, { fontFamily: 'Verdana', fontSize: '20px', color: '#eaf7ff' }).setOrigin(0.5);
    button.on('pointerdown', onClick);
    text.setDepth(button.depth + 1);
  }
}
