import Phaser from 'phaser';
import { MODULE_BY_ID } from '../data/starlightModules';
import { salvageValue } from '../systems/starlightInventory';
import { SCENE_KEYS } from '../util/starlightConstants';
import { chooseRunPerks, clearPendingResult, commitPendingResult, getPendingResult, getSave, setSelectedMissionId, startActiveRun } from './starlightState';

export class ResultsScene extends Phaser.Scene {
  private salvageSelection = new Set<string>();
  private pendingApplied = false;

  constructor() {
    super(SCENE_KEYS.results);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a1422');
    const { width, height } = this.scale;

    const result = getPendingResult();
    if (!result) {
      this.scene.start(SCENE_KEYS.missionSelect);
      return;
    }

    this.add.text(width * 0.5, 68, result.won ? 'Mission Complete' : 'Mission Failed', {
      fontFamily: 'Verdana',
      fontSize: '48px',
      color: result.won ? '#c5ffdf' : '#ffd2d2'
    }).setOrigin(0.5);

    this.add.text(width * 0.5, 128, `Score ${result.score} | Credits ${result.credits} | Salvage ${result.salvage}`, {
      fontFamily: 'Verdana',
      fontSize: '22px',
      color: '#d7eeff'
    }).setOrigin(0.5);

    const uniqueLoot = [...new Set(result.modules)];
    this.add.text(42, 184, 'Loot (tap to auto-salvage):', { fontFamily: 'Verdana', fontSize: '20px', color: '#b6dbfa' });

    uniqueLoot.forEach((moduleId, index) => {
      const mod = MODULE_BY_ID.get(moduleId);
      const rarityColor = mod?.rarity === 'epic' ? '#ffc3ff' : mod?.rarity === 'rare' ? '#9fd6ff' : '#d4e8f9';
      const y = 230 + index * 64;
      const row = this.add.rectangle(width * 0.5, y, width * 0.9, 52, 0x18314a, 0.9).setStrokeStyle(2, 0x7cb8ea).setInteractive();
      const text = this.add.text(56, y - 11, `${moduleId}  (${mod?.rarity ?? 'common'})`, { fontFamily: 'Verdana', fontSize: '18px', color: rarityColor });
      const value = this.add.text(width - 220, y - 11, `salvage +${salvageValue(moduleId)}`, { fontFamily: 'Verdana', fontSize: '16px', color: '#ffd8a3' });

      row.on('pointerdown', () => {
        if (this.salvageSelection.has(moduleId)) {
          this.salvageSelection.delete(moduleId);
          row.setFillStyle(0x18314a, 0.9);
        } else {
          this.salvageSelection.add(moduleId);
          row.setFillStyle(0x3a2f22, 0.95);
        }
      });

      text.setDepth(row.depth + 1);
      value.setDepth(row.depth + 1);
    });

    this.makeButton(width * 0.5, height - 214, 'Apply Rewards', () => {
      if (this.pendingApplied) return;
      commitPendingResult([...this.salvageSelection]);
      this.pendingApplied = true;
      const save = getSave();
      this.add.text(width * 0.5, height - 268, `Total Credits ${save.credits} | Materials ${save.materials}`, {
        fontFamily: 'Verdana',
        fontSize: '20px',
        color: '#d6f0ff'
      }).setOrigin(0.5);
    });

    this.makeButton(width * 0.5, height - 146, 'Back to Hangar', () => {
      if (!this.pendingApplied) commitPendingResult([...this.salvageSelection]);
      clearPendingResult();
      this.scene.start(SCENE_KEYS.hangar);
    });

    this.makeButton(width * 0.5, height - 82, 'Run Again', () => {
      if (!this.pendingApplied) commitPendingResult([...this.salvageSelection]);
      clearPendingResult();
      setSelectedMissionId(result.missionId);
      startActiveRun(result.missionId);
      chooseRunPerks();
      this.scene.start(SCENE_KEYS.perkPick);
    });

    const missionBtn = this.add.rectangle(width - 110, 62, 180, 46, 0x24557f, 0.95).setStrokeStyle(2, 0x94ceff).setInteractive();
    const missionText = this.add.text(width - 110, 62, 'Mission Select', { fontFamily: 'Verdana', fontSize: '18px', color: '#f4fcff' }).setOrigin(0.5);
    missionBtn.on('pointerdown', () => {
      if (!this.pendingApplied) commitPendingResult([...this.salvageSelection]);
      clearPendingResult();
      this.scene.start(SCENE_KEYS.missionSelect);
    });
    missionText.setDepth(missionBtn.depth + 1);
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const button = this.add.rectangle(x, y, 340, 54, 0x24557f, 0.95).setStrokeStyle(2, 0x94ceff).setInteractive();
    const text = this.add.text(x, y, label, { fontFamily: 'Verdana', fontSize: '22px', color: '#f4fcff' }).setOrigin(0.5);
    button.on('pointerdown', onClick);
    text.setDepth(button.depth + 1);
  }
}
