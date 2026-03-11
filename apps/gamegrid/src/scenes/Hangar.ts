import Phaser from 'phaser';
import { MODULE_BY_ID } from '../data/starlightModules';
import type { ModuleDef, ModuleSlot, SaveBlob } from '../data/starlightTypes';
import { countOwned, uniqueInventory } from '../systems/starlightInventory';
import { computeFitting } from '../systems/starlightModuleSystem';
import { SCENE_KEYS } from '../util/starlightConstants';
import { buildLaunchValidation, getSave, updateSave } from './starlightState';

const SLOT_LABELS: Record<ModuleSlot, string> = {
  primary: 'Weapon 1',
  secondary: 'Weapon 2',
  defenseA: 'Defense 1',
  defenseB: 'Defense 2',
  utility: 'Utility',
  rig: 'Rig'
};

type SortKey = 'rarity' | 'powerCost' | 'dps' | 'heat';

export class HangarScene extends Phaser.Scene {
  private save!: SaveBlob;
  private overviewText!: Phaser.GameObjects.Text;
  private warningText!: Phaser.GameObjects.Text;
  private slotValueText = new Map<ModuleSlot, Phaser.GameObjects.Text>();

  private pickerPanel!: Phaser.GameObjects.Container;
  private pickerTitle!: Phaser.GameObjects.Text;
  private pickerBody!: Phaser.GameObjects.Text;
  private selectedSlot: ModuleSlot | null = null;
  private sortKey: SortKey = 'rarity';

  constructor() {
    super(SCENE_KEYS.hangar);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#091221');
    this.save = getSave();
    const { width, height } = this.scale;

    this.add.text(width * 0.5, 44, 'Hangar Fitting', { fontFamily: 'Verdana', fontSize: '40px', color: '#d9f0ff' }).setOrigin(0.5);

    const overviewCard = this.add.rectangle(width * 0.5, 152, width * 0.9, 170, 0x13324f, 0.92).setStrokeStyle(2, 0x8fceff);
    this.overviewText = this.add.text(54, 98, '', { fontFamily: 'Verdana', fontSize: '18px', color: '#b8dcfa', lineSpacing: 8 });
    this.warningText = this.add.text(54, 238, '', { fontFamily: 'Verdana', fontSize: '18px', color: '#ffd09f' });
    overviewCard.setDepth(5);
    this.overviewText.setDepth(6);
    this.warningText.setDepth(6);

    const slotOrder = Object.keys(this.save.equippedSlots) as ModuleSlot[];
    slotOrder.forEach((slot, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = col === 0 ? width * 0.27 : width * 0.73;
      const y = 332 + row * 130;
      this.makeSlotCard(slot, x, y);
    });

    this.makeButton(width * 0.5, height - 210, 'Mission Select', () => {
      const validation = buildLaunchValidation(this.save);
      if (!validation.ok) {
        this.flashMessage(validation.reason ?? 'Invalid loadout');
        return;
      }
      this.scene.start(SCENE_KEYS.missionSelect);
    }, 320, 62);

    this.makeButton(width * 0.5, height - 132, 'Back To Menu', () => this.scene.start(SCENE_KEYS.menu), 320, 62);

    this.buildPicker();
    this.refreshOverview();
  }

  private makeSlotCard(slot: ModuleSlot, x: number, y: number): void {
    const box = this.add.rectangle(x, y, 300, 108, 0x173f62, 0.9).setStrokeStyle(2, 0x8cc9fb).setInteractive();
    const title = this.add.text(x - 130, y - 40, SLOT_LABELS[slot], { fontFamily: 'Verdana', fontSize: '18px', color: '#e7f3ff' });
    const value = this.add.text(x - 130, y - 6, this.save.equippedSlots[slot] ?? 'Empty', { fontFamily: 'Verdana', fontSize: '16px', color: '#bce4ff', wordWrap: { width: 250 } });
    const tap = this.add.text(x - 130, y + 30, 'Tap to change', { fontFamily: 'Verdana', fontSize: '14px', color: '#9ec6e7' });

    this.slotValueText.set(slot, value);
    box.on('pointerdown', () => this.openPicker(slot));
    title.setDepth(box.depth + 1);
    value.setDepth(box.depth + 1);
    tap.setDepth(box.depth + 1);
  }

  private buildPicker(): void {
    const { width, height } = this.scale;
    const bg = this.add.rectangle(width * 0.5, height * 0.5, width * 0.94, height * 0.86, 0x061224, 0.97).setStrokeStyle(2, 0x8ec8fb).setInteractive();
    this.pickerTitle = this.add.text(width * 0.5, 126, 'Module Picker', { fontFamily: 'Verdana', fontSize: '30px', color: '#eaf8ff' }).setOrigin(0.5);
    this.pickerBody = this.add.text(44, 176, '', { fontFamily: 'Verdana', fontSize: '16px', color: '#bfe4ff', lineSpacing: 8, wordWrap: { width: width - 88 } });

    const close = this.makeButton(width - 80, 74, 'X', () => this.closePicker(), 64, 48, true);

    const sortButtons: Array<{ key: SortKey; label: string; x: number }> = [
      { key: 'rarity', label: 'Rarity', x: 98 },
      { key: 'powerCost', label: 'Power', x: 228 },
      { key: 'dps', label: 'DPS', x: 358 },
      { key: 'heat', label: 'Heat', x: 488 }
    ];

    const sortTexts = sortButtons.map((btn) => this.makeButton(btn.x, 126, btn.label, () => {
      this.sortKey = btn.key;
      this.refreshPicker();
    }, 116, 42, true));

    this.pickerPanel = this.add.container(0, 0, [bg, this.pickerTitle, this.pickerBody, close.rect, close.text, ...sortTexts.flatMap((entry) => [entry.rect, entry.text])]);
    this.pickerPanel.setDepth(180).setVisible(false);
  }

  private openPicker(slot: ModuleSlot): void {
    this.selectedSlot = slot;
    this.pickerPanel.setVisible(true);
    this.refreshPicker();
  }

  private closePicker(): void {
    this.pickerPanel.setVisible(false);
    this.selectedSlot = null;
  }

  private refreshPicker(): void {
    const slot = this.selectedSlot;
    if (!slot) return;

    this.pickerTitle.setText(`Pick ${SLOT_LABELS[slot]}`);

    const owned = uniqueInventory(this.save.inventory)
      .map((id) => MODULE_BY_ID.get(id))
      .filter((module): module is ModuleDef => Boolean(module && module.slot === slot));

    const candidates = [...owned].sort((a, b) => this.compareModules(a, b, this.sortKey));

    const currentId = this.save.equippedSlots[slot];
    const current = currentId ? MODULE_BY_ID.get(currentId) : null;
    const lines: string[] = [
      `Current: ${current?.name ?? 'Empty'}  [Tap number to equip, U to unequip]`,
      ''
    ];

    candidates.slice(0, 10).forEach((module, index) => {
      const ownedCount = countOwned(this.save.inventory, module.id);
      const delta = this.compareDelta(slot, module.id);
      lines.push(`${index + 1}. ${module.name} (${module.rarity}) x${ownedCount}`);
      lines.push(`   Pwr ${module.powerCost} Heat ${module.heatPerSecond.toFixed(1)} DPS ${this.moduleDps(module).toFixed(1)}  Δ ${delta}`);
    });

    lines.push('');
    lines.push('Tap anywhere on list row number zone to equip (1-10).');
    this.pickerBody.setText(lines);

    this.input.once('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.pickerPanel.visible) return;
      const localY = pointer.y;
      if (localY < 170 || localY > this.scale.height - 120) return;
      const idx = Math.floor((localY - 230) / 54);
      if (idx >= 0 && idx < Math.min(10, candidates.length)) {
        this.equip(slot, candidates[idx]!.id);
      }
    });

    this.input.keyboard?.once('keydown-U', () => {
      this.unequip(slot);
      this.refreshPicker();
    });
  }

  private compareModules(a: ModuleDef, b: ModuleDef, key: SortKey): number {
    if (key === 'rarity') {
      const rank = { epic: 0, rare: 1, common: 2 } as const;
      return rank[a.rarity] - rank[b.rarity];
    }
    if (key === 'powerCost') return a.powerCost - b.powerCost;
    if (key === 'heat') return a.heatPerSecond - b.heatPerSecond;
    return this.moduleDps(b) - this.moduleDps(a);
  }

  private moduleDps(module: ModuleDef): number {
    return (module.damage ?? 0) * (module.fireRate ?? 1);
  }

  private compareDelta(slot: ModuleSlot, moduleId: string): string {
    const currentFit = computeFitting(this.save, null);
    const nextSave: SaveBlob = {
      ...this.save,
      equippedSlots: { ...this.save.equippedSlots, [slot]: moduleId }
    };
    const nextFit = computeFitting(nextSave, null);
    const dp = nextFit.totalPower - currentFit.totalPower;
    const ds = nextFit.stats.maxShield - currentFit.stats.maxShield;
    const dh = nextFit.stats.maxHull - currentFit.stats.maxHull;
    const dps = (nextFit.primaryWeapon.damage + nextFit.secondaryWeapon.damage) - (currentFit.primaryWeapon.damage + currentFit.secondaryWeapon.damage);
    return `P${dp >= 0 ? '+' : ''}${dp} S${ds >= 0 ? '+' : ''}${ds} H${dh >= 0 ? '+' : ''}${dh} Dmg${dps >= 0 ? '+' : ''}${dps}`;
  }

  private equip(slot: ModuleSlot, moduleId: string): void {
    this.save = {
      ...this.save,
      equippedSlots: {
        ...this.save.equippedSlots,
        [slot]: moduleId
      }
    };
    updateSave(this.save);
    this.slotValueText.get(slot)?.setText(moduleId);
    this.refreshOverview();
    this.refreshPicker();
  }

  private unequip(slot: ModuleSlot): void {
    this.save = {
      ...this.save,
      equippedSlots: {
        ...this.save.equippedSlots,
        [slot]: null
      }
    };
    updateSave(this.save);
    this.slotValueText.get(slot)?.setText('Empty');
    this.refreshOverview();
  }

  private refreshOverview(): void {
    const fit = computeFitting(this.save, null);
    const validation = buildLaunchValidation(this.save);
    const heatRisk = fit.totalHeat > fit.stats.heatCapacity * 0.75 ? 'HIGH' : fit.totalHeat > fit.stats.heatCapacity * 0.5 ? 'MED' : 'LOW';

    this.overviewText.setText([
      `Power ${fit.totalPower.toFixed(0)} / ${fit.stats.powerBudget}`,
      `Heat profile ${fit.totalHeat.toFixed(0)} / ${fit.stats.heatCapacity.toFixed(0)}  Risk ${heatRisk}`,
      `Hull ${fit.stats.maxHull.toFixed(0)}  Shield ${fit.stats.maxShield.toFixed(0)}  Regen ${fit.stats.shieldRegen.toFixed(1)}`,
      `Speed ${fit.stats.maxSpeed.toFixed(0)}  Accel ${fit.stats.accel.toFixed(0)}  Crit ${(fit.stats.critChance * 100).toFixed(0)}%`
    ]);

    this.warningText.setText(validation.ok ? '' : `Launch blocked: ${validation.reason}`);
  }

  private flashMessage(text: string): void {
    const msg = this.add.text(this.scale.width * 0.5, this.scale.height - 52, text, { fontFamily: 'Verdana', fontSize: '18px', color: '#ffd18d' }).setOrigin(0.5);
    this.tweens.add({ targets: msg, alpha: 0, duration: 700, onComplete: () => msg.destroy() });
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    width = 120,
    height = 44,
    compact = false
  ): { rect: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text } {
    const rect = this.add.rectangle(x, y, width, height, compact ? 0x2a4768 : 0x2a547a, 0.95).setStrokeStyle(2, 0xa0d8ff).setInteractive();
    const text = this.add.text(x, y, label, { fontFamily: 'Verdana', fontSize: compact ? '16px' : '20px', color: '#f0fbff' }).setOrigin(0.5);
    rect.on('pointerdown', onClick);
    text.setDepth(rect.depth + 1);
    return { rect, text };
  }
}
